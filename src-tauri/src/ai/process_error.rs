pub fn diagnostic(prefix: &str, stderr: &str, stdout: &[String]) -> String {
    let details = if stderr.trim().is_empty() {
        stdout.join(" ")
    } else {
        stderr.to_owned()
    };
    let details = details.trim();
    if details.is_empty() {
        prefix.into()
    } else {
        format!("{prefix}：{details}")
    }
}

pub fn classify_error(message: &str) -> &'static str {
    let value = message.to_lowercase();
    if value.contains("login") || value.contains("auth") || value.contains("401") {
        "AUTH_EXPIRED"
    } else if value.contains("network") || value.contains("dns") || value.contains("timed out") {
        "NETWORK_ERROR"
    } else {
        "PROVIDER_ERROR"
    }
}
