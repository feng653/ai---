mod assets;
mod card_records;
mod cards;
#[cfg(test)]
mod tests;

use crate::error::AppError;
use chrono::Utc;
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};

const MIGRATION_1: &str = include_str!("../migrations/001_initial.sql");

pub struct Storage {
    pub(super) connection: Mutex<Connection>,
    pub(super) assets_dir: PathBuf,
}

impl Storage {
    pub fn open(data_dir: &Path) -> Result<Self, AppError> {
        fs::create_dir_all(data_dir)?;
        let assets_dir = data_dir.join("assets");
        fs::create_dir_all(&assets_dir)?;
        let database_path = data_dir.join("zhishi.sqlite3");
        let existed = database_path.exists();
        let mut connection = Connection::open(&database_path)?;
        connection.pragma_update(None, "foreign_keys", true)?;
        connection.pragma_update(None, "journal_mode", "WAL")?;
        connection.busy_timeout(std::time::Duration::from_secs(5))?;
        let version: i64 = connection.pragma_query_value(None, "user_version", |row| row.get(0))?;
        if version < 1 {
            if existed && fs::metadata(&database_path)?.len() > 0 {
                let backup = data_dir.join(format!(
                    "zhishi.sqlite3.before-v1-{}.bak",
                    Utc::now().format("%Y%m%d%H%M%S")
                ));
                fs::copy(&database_path, backup)?;
            }
            let transaction = connection.transaction()?;
            transaction.execute_batch(MIGRATION_1)?;
            transaction.commit()?;
        }
        Ok(Self {
            connection: Mutex::new(connection),
            assets_dir,
        })
    }

    pub(super) fn lock(&self) -> Result<MutexGuard<'_, Connection>, AppError> {
        self.connection
            .lock()
            .map_err(|_| AppError::new("DATABASE_ERROR", "数据库连接锁已损坏"))
    }
}
