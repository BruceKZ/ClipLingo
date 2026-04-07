use keyring::{Entry, Error as KeyringError};

use crate::services::config::ConfigServiceError;

const SERVICE_NAME: &str = "com.brucekz.cliplingo";

pub trait SecretStore {
    fn set_secret(&self, key: &str, secret: &str) -> Result<(), ConfigServiceError>;
    fn get_secret(&self, key: &str) -> Result<Option<String>, ConfigServiceError>;
    fn delete_secret(&self, key: &str) -> Result<(), ConfigServiceError>;
}

#[derive(Debug, Default, Clone, Copy)]
pub struct KeyringSecretStore;

impl KeyringSecretStore {
    fn entry(&self, key: &str) -> Result<Entry, ConfigServiceError> {
        Entry::new(SERVICE_NAME, key)
            .map_err(|error| ConfigServiceError::SecretStore(error.to_string()))
    }
}

impl SecretStore for KeyringSecretStore {
    fn set_secret(&self, key: &str, secret: &str) -> Result<(), ConfigServiceError> {
        self.entry(key)?
            .set_password(secret)
            .map_err(|error| ConfigServiceError::SecretStore(error.to_string()))
    }

    fn get_secret(&self, key: &str) -> Result<Option<String>, ConfigServiceError> {
        match self.entry(key)?.get_password() {
            Ok(secret) => Ok(Some(secret)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(error) => Err(ConfigServiceError::SecretStore(error.to_string())),
        }
    }

    fn delete_secret(&self, key: &str) -> Result<(), ConfigServiceError> {
        match self.entry(key)?.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(error) => Err(ConfigServiceError::SecretStore(error.to_string())),
        }
    }
}
