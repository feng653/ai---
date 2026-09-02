use super::Storage;
use crate::domain::CardAsset;
use crate::error::AppError;
use chrono::Utc;
use image::ImageFormat;
use rusqlite::{params, OptionalExtension};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;
use uuid::Uuid;

const MAX_ASSET_BYTES: usize = 15 * 1024 * 1024;

impl Storage {
    pub fn import_asset(
        &self,
        file_name: &str,
        mime_type: &str,
        bytes: &[u8],
    ) -> Result<CardAsset, AppError> {
        if bytes.is_empty() || bytes.len() > MAX_ASSET_BYTES {
            return Err(AppError::new(
                "UNSUPPORTED_IMAGE",
                "图片不能为空且大小不能超过 15 MiB",
            ));
        }
        let (format, extension) = image_format(mime_type, bytes)?;
        let image = image::load_from_memory_with_format(bytes, format)
            .map_err(|_| AppError::new("UNSUPPORTED_IMAGE", "图片内容损坏或无法解码"))?;
        let id = Uuid::new_v4().to_string();
        let relative_path = format!("imports/{id}.{extension}");
        let absolute_path = self.assets_dir.join(&relative_path);
        if let Some(parent) = absolute_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(&absolute_path, bytes)?;
        let sha256 = hex::encode(Sha256::digest(bytes));
        let now = Utc::now().to_rfc3339();
        let result = self.lock()?.execute(
            "INSERT INTO card_assets (id, card_id, relative_path, file_name, mime_type, byte_size, width, height, sha256, sort_order, created_at) VALUES (?1,NULL,?2,?3,?4,?5,?6,?7,?8,0,?9)",
            params![id, relative_path, safe_file_name(file_name), mime_type, bytes.len() as u64, image.width(), image.height(), sha256, now],
        );
        if let Err(error) = result {
            let _ = fs::remove_file(absolute_path);
            return Err(error.into());
        }
        Ok(CardAsset {
            id,
            relative_path,
            mime_type: mime_type.to_owned(),
            byte_size: bytes.len() as u64,
            width: Some(image.width()),
            height: Some(image.height()),
        })
    }

    pub fn read_asset(&self, id: &str) -> Result<Vec<u8>, AppError> {
        let relative_path: Option<String> = self
            .lock()?
            .query_row(
                "SELECT relative_path FROM card_assets WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .optional()?;
        let path = relative_path.ok_or_else(|| AppError::new("NOT_FOUND", "图片资源不存在"))?;
        fs::read(resolve_relative_path(&self.assets_dir, &path)?).map_err(AppError::from)
    }

    pub fn resolve_asset_paths(
        &self,
        assets: &[CardAsset],
    ) -> Result<Vec<std::path::PathBuf>, AppError> {
        if assets.len() > 8 {
            return Err(AppError::validation("AI 整理一次最多处理 8 张图片"));
        }
        let connection = self.lock()?;
        assets
            .iter()
            .map(|asset| {
                let relative_path: Option<String> = connection
                    .query_row(
                        "SELECT relative_path FROM card_assets WHERE id = ?1",
                        [&asset.id],
                        |row| row.get(0),
                    )
                    .optional()?;
                let relative_path = relative_path.ok_or_else(|| {
                    AppError::new("NOT_FOUND", format!("图片资源不存在：{}", asset.id))
                })?;
                let path = resolve_relative_path(&self.assets_dir, &relative_path)?;
                if !path.is_file() {
                    return Err(AppError::new(
                        "FILE_ERROR",
                        format!("图片文件不存在：{}", asset.id),
                    ));
                }
                Ok(path)
            })
            .collect()
    }

    pub fn delete_asset(&self, id: &str) -> Result<(), AppError> {
        let connection = self.lock()?;
        let path: Option<String> = connection
            .query_row(
                "SELECT relative_path FROM card_assets WHERE id = ?1",
                [id],
                |row| row.get(0),
            )
            .optional()?;
        let Some(path) = path else {
            return Err(AppError::new("NOT_FOUND", "图片资源不存在"));
        };
        connection.execute("DELETE FROM card_assets WHERE id = ?1", [id])?;
        drop(connection);
        remove_relative_file(&self.assets_dir, &path)
    }
}

fn image_format(mime_type: &str, bytes: &[u8]) -> Result<(ImageFormat, &'static str), AppError> {
    let expected = match mime_type {
        "image/png" => (ImageFormat::Png, "png"),
        "image/jpeg" => (ImageFormat::Jpeg, "jpg"),
        "image/webp" => (ImageFormat::WebP, "webp"),
        "image/gif" => (ImageFormat::Gif, "gif"),
        _ => {
            return Err(AppError::new(
                "UNSUPPORTED_IMAGE",
                "仅支持 PNG、JPEG、WebP 或 GIF 图片",
            ))
        }
    };
    let guessed = image::guess_format(bytes)
        .map_err(|_| AppError::new("UNSUPPORTED_IMAGE", "无法识别图片格式"))?;
    if guessed != expected.0 {
        return Err(AppError::new(
            "UNSUPPORTED_IMAGE",
            "图片 MIME 类型与文件内容不一致",
        ));
    }
    Ok(expected)
}

fn safe_file_name(value: &str) -> String {
    Path::new(value)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.is_empty())
        .unwrap_or("image")
        .to_owned()
}

fn resolve_relative_path(
    assets_dir: &Path,
    relative_path: &str,
) -> Result<std::path::PathBuf, AppError> {
    let path = Path::new(relative_path);
    if path.is_absolute()
        || path
            .components()
            .any(|part| matches!(part, std::path::Component::ParentDir))
    {
        return Err(AppError::new("FILE_ERROR", "数据库中的图片相对路径无效"));
    }
    Ok(assets_dir.join(path))
}

pub(super) fn remove_relative_file(assets_dir: &Path, relative_path: &str) -> Result<(), AppError> {
    match fs::remove_file(resolve_relative_path(assets_dir, relative_path)?) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.into()),
    }
}
