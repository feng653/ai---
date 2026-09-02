use super::*;

fn input(url: &str) -> ApiProviderInput {
    ApiProviderInput {
        id: DEEPSEEK_ID.into(),
        name: "DeepSeek".into(),
        base_url: url.into(),
        model: "deepseek-chat".into(),
        api_key: String::new(),
    }
}

#[test]
fn accepts_https_and_loopback_http_only() {
    assert!(validate_api_input(&input("https://api.deepseek.com")).is_ok());
    assert!(validate_api_input(&input("http://localhost:11434/v1")).is_ok());
    assert!(validate_api_input(&input("http://example.com/v1")).is_err());
}

#[test]
fn accepts_multiple_uuid_scoped_custom_providers() {
    let mut first = input("https://one.example/v1");
    first.id = "custom:318cba6f-9eff-4e95-9332-70bedf376977".into();
    let mut second = input("https://two.example/v1");
    second.id = "custom:a46fcc5d-da6c-49fc-87dc-96e41a4c50c4".into();
    assert!(validate_api_input(&first).is_ok());
    assert!(validate_api_input(&second).is_ok());
    first.id = "custom:not-a-uuid".into();
    assert!(validate_api_input(&first).is_err());
}

#[test]
fn lists_multiple_custom_configs_without_the_deepseek_slot() {
    let directory = tempfile::tempdir().unwrap();
    let store = SettingsStore::open(directory.path()).unwrap();
    let mut values = store.lock().unwrap();
    for (id, name) in [
        ("custom:318cba6f-9eff-4e95-9332-70bedf376977", "Second"),
        ("custom:a46fcc5d-da6c-49fc-87dc-96e41a4c50c4", "First"),
        (DEEPSEEK_ID, "DeepSeek"),
    ] {
        values.api_providers.insert(
            id.into(),
            ApiProviderConfig {
                name: name.into(),
                base_url: "https://example.com/v1".into(),
                model: "model".into(),
            },
        );
    }
    drop(values);
    let configs = store.custom_configs().unwrap();
    assert_eq!(configs.len(), 2);
    assert_eq!(configs[0].1.name, "First");
    assert_eq!(configs[1].1.name, "Second");
}

#[test]
fn rejects_unknown_provider_and_url_metadata() {
    let mut value = input("https://example.com/v1?token=secret");
    assert!(validate_api_input(&value).is_err());
    value.id = "unknown".into();
    value.base_url = "https://example.com".into();
    assert!(validate_api_input(&value).is_err());
    value.id = DEEPSEEK_ID.into();
    value.base_url = "https://user:password@example.com".into();
    assert!(validate_api_input(&value).is_err());
}

#[test]
fn persists_active_provider_without_a_secret() {
    let directory = tempfile::tempdir().unwrap();
    let store = SettingsStore::open(directory.path()).unwrap();
    store.select(CODEX_ID).unwrap();
    store.select(CODEX_ID).unwrap();
    drop(store);
    assert_eq!(
        SettingsStore::open(directory.path())
            .unwrap()
            .active()
            .unwrap(),
        CODEX_ID
    );
    let text = fs::read_to_string(directory.path().join("ai/providers.json")).unwrap();
    assert!(!text.contains("apiKey"));
}

#[test]
fn refuses_to_remove_an_unknown_provider() {
    let directory = tempfile::tempdir().unwrap();
    let store = SettingsStore::open(directory.path()).unwrap();
    assert_eq!(
        store.remove_api("unknown").unwrap_err().code,
        "VALIDATION_ERROR"
    );
}
