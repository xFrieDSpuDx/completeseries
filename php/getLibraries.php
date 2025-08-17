<?php
// existingSeriesFetcher.php

header("Content-Type: application/json");

// -----------------------------------------------------------------------------
// Step 1: Read and validate input from client
// -----------------------------------------------------------------------------
$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON input"]);
    exit;
}

$serverUrl = rtrim((string)($input["url"] ?? ""), "/");
$username  = trim((string)($input["username"] ?? ""));
$password  = trim((string)($input["password"] ?? ""));
$authToken = trim((string)($input["apiKey"] ?? ""));

// Parse boolean safely from JSON true/false or strings "true"/"false"
$useApiKey = filter_var($input["useApiKey"] ?? false, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
if ($useApiKey === null) { $useApiKey = false; }

// Basic URL check
if (!$serverUrl) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required field: url"]);
    exit;
}

// Conditional auth requirements
if ($useApiKey) {
    if (!$authToken) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Missing required field: authToken (required when useApiKey=true)"
        ]);
        exit;
    }
} else {
    if (!$username || !$password) {
        http_response_code(400);
        echo json_encode([
            "status" => "error",
            "message" => "Missing required fields: username and password (or set useApiKey=true with authToken)"
        ]);
        exit;
    }
}

// -----------------------------------------------------------------------------
// Step 2: Authenticate with Audiobookshelf API (only if not using API key)
// -----------------------------------------------------------------------------
if (!$useApiKey) {
    $loginUrl = "$serverUrl/login";
    $loginPayload = json_encode([
        "username" => $username,
        "password" => $password
    ]);

    $loginCurl = curl_init($loginUrl);
    curl_setopt_array($loginCurl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ["Content-Type: application/json", "Accept: application/json"],
        CURLOPT_POSTFIELDS => $loginPayload
    ]);

    $loginResponse = curl_exec($loginCurl);
    $loginStatus   = curl_getinfo($loginCurl, CURLINFO_HTTP_CODE);
    $curlError     = curl_error($loginCurl);
    curl_close($loginCurl);

    if ($loginStatus < 200 || $loginStatus >= 300) {
        http_response_code($loginStatus ?: 500);
        echo json_encode([
            "status" => "error",
            "message" => $curlError ?: "Login failed",
            "details" => $loginResponse,
            "responseCode" => $loginStatus
        ]);
        exit;
    }

    $loginData = json_decode($loginResponse, true);
    $libraryId = $loginData["userDefaultLibraryId"] ?? null;
    $authToken = $loginData["user"]["token"] ?? null;

    if (!$libraryId || !$authToken) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Missing library ID or token in login response"
        ]);
        exit;
    }
}

// -----------------------------------------------------------------------------
// Step 3: Fetch all libraries
// -----------------------------------------------------------------------------
$librariesUrl = "$serverUrl/api/libraries";
$librariesCurl = curl_init($librariesUrl);
curl_setopt_array($librariesCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer $authToken",
        "Accept: application/json"
    ],
]);

$librariesResponse = curl_exec($librariesCurl);
$librariesStatus   = curl_getinfo($librariesCurl, CURLINFO_HTTP_CODE);
$libsCurlError     = curl_error($librariesCurl);
curl_close($librariesCurl);

if ($librariesStatus < 200 || $librariesStatus >= 300) {
    http_response_code($librariesStatus ?: 500);
    echo json_encode([
        "status" => "error",
        "message" => $libsCurlError ?: "Failed to fetch libraries",
        "details" => $librariesResponse,
        "responseCode" => $librariesStatus
    ]);
    exit;
}

$librariesData = json_decode($librariesResponse, true);
if (!is_array($librariesData)) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Invalid JSON structure in libraries response"
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 4: Return audiobook libraries only
// -----------------------------------------------------------------------------
$librariesList = $librariesData["libraries"] ?? [];
$booksOnlyLibrariesList = array_values(array_filter($librariesList, function ($item) {
    return isset($item["mediaType"]) && $item["mediaType"] === "book";
}));

// -----------------------------------------------------------------------------
// Step 5: Respond with structured result
// -----------------------------------------------------------------------------
echo json_encode([
    "status" => "success",
    "authToken" => $authToken,
    "librariesList" => $booksOnlyLibrariesList
]);
