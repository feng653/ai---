use super::*;
use std::io::{Read, Write};
use std::net::TcpListener;

#[test]
fn extracts_chat_completion_content() {
    let body = r#"{"choices":[{"message":{"content":"{\"warnings\":[]}"}}]}"#;
    assert_eq!(extract_content(body).unwrap(), r#"{"warnings":[]}"#);
}

#[test]
fn classifies_http_failures_without_panicking() {
    assert_eq!(
        ensure_success(StatusCode::UNAUTHORIZED, "no".into())
            .unwrap_err()
            .code,
        "AUTH_EXPIRED"
    );
    assert_eq!(
        ensure_success(StatusCode::TOO_MANY_REQUESTS, "slow".into())
            .unwrap_err()
            .code,
        "RATE_LIMITED"
    );
}

#[test]
fn tests_the_standard_models_endpoint_with_bearer_auth() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let server = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        stream
            .set_read_timeout(Some(Duration::from_secs(2)))
            .unwrap();
        let mut bytes = [0_u8; 2048];
        let size = stream.read(&mut bytes).unwrap();
        stream.write_all(
            b"HTTP/1.1 200 OK\r\nContent-Length: 11\r\nContent-Type: application/json\r\n\r\n{\"data\":[]}",
        )
        .unwrap();
        String::from_utf8_lossy(&bytes[..size]).into_owned()
    });
    let config = ApiProviderConfig {
        name: "Local".into(),
        base_url: format!("http://{address}"),
        model: "model".into(),
    };
    tauri::async_runtime::block_on(test_connection(
        &http_client().unwrap(),
        &config,
        "test-secret",
    ))
    .unwrap();
    let request = server.join().unwrap();
    assert!(request.starts_with("GET /models HTTP/1.1"));
    assert!(request
        .to_ascii_lowercase()
        .contains("authorization: bearer test-secret"));
}
