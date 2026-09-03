use crate::error::AppError;
use std::path::PathBuf;
use tempfile::TempDir;

pub(super) fn stage_images(
    directory: &TempDir,
    sources: &[PathBuf],
) -> Result<Vec<PathBuf>, AppError> {
    sources
        .iter()
        .enumerate()
        .map(|(index, source)| {
            let extension = source
                .extension()
                .and_then(|value| value.to_str())
                .filter(|value| value.chars().all(|item| item.is_ascii_alphanumeric()))
                .unwrap_or("img");
            let target = directory
                .path()
                .join(format!("input-{}.{}", index + 1, extension));
            std::fs::copy(source, &target).map_err(|error| {
                AppError::new("FILE_ERROR", format!("AI 图片暂存失败：{error}"))
            })?;
            Ok(target)
        })
        .collect()
}
