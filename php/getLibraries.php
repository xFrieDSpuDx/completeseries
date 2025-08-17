<?php
// existingSeriesFetcher.php

// Set response type to JSON
header("Content-Type: application/json");

// -----------------------------------------------------------------------------
// Step 1: Read and validate input from client
// -----------------------------------------------------------------------------

$rawInput = file_get_contents("php://input");
$input = json_decode($rawInput, true);

// Validate that input is a valid JSON object
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Invalid JSON input"]);
    exit;
}

// Extract and sanitize required fields
$serverUrl = rtrim($input["url"] ?? "", "/");
$username = trim($input["username"] ?? "");
$password = trim($input["password"] ?? "");

// Ensure required fields are present
if (!$serverUrl || !$username || !$password) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Missing required fields: url, username, or password"
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 2: Authenticate with Audiobookshelf API
// -----------------------------------------------------------------------------

$loginUrl = "$serverUrl/login";
$loginPayload = json_encode([
    "username" => $username,
    "password" => $password
]);

// Initialize cURL for login request
$loginCurl = curl_init($loginUrl);
curl_setopt_array($loginCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CONNECTTIMEOUT => 3,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ["Content-Type: application/json"],
    CURLOPT_POSTFIELDS => $loginPayload
]);

$loginResponse = curl_exec($loginCurl);
$loginStatus = curl_getinfo($loginCurl, CURLINFO_HTTP_CODE);
$curlError = curl_error($loginCurl);
curl_close($loginCurl);

// Handle failed login
if ($loginStatus < 200 || $loginStatus >= 300) {
    http_response_code($loginStatus);
    echo json_encode([
        "status" => "error",
        "message" => $curlError ?: "Login failed",
        "details" => $loginResponse,
        "responseCode" => $loginStatus
    ]);
    exit;
}

// Parse login response for token and library ID
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

// -----------------------------------------------------------------------------
// Step 3: Fetch all libraries
// -----------------------------------------------------------------------------

$librariesUrl = "$serverUrl/api/libraries";

$librariesCurl = curl_init($librariesUrl);
curl_setopt_array($librariesCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer $authToken"]
]);

$librariesResponse = curl_exec($librariesCurl);
$librariesStatus = curl_getinfo($librariesCurl, CURLINFO_HTTP_CODE);
curl_close($librariesCurl);

// Handle fetch failure
if ($librariesStatus < 200 || $librariesStatus >= 300) {
    http_response_code($librariesStatus);
    echo json_encode([
        "status" => "error",
        "message" => "Failed to fetch libraries",
        "details" => $librariesResponse
    ]);
    exit;
}

// Parse libraries response and verify structure
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

// Extract library list
$librariesList = $librariesData["libraries"] ?? [];

$booksOnlyLibrariesList = array_filter($librariesList, function($item) {
    return isset($item["mediaType"]) && $item["mediaType"] === "book";
});

// Optionally reindex the array if needed
$booksOnlyLibrariesList = array_values($booksOnlyLibrariesList);


// -----------------------------------------------------------------------------
// Step 5: Respond with structured result
// -----------------------------------------------------------------------------

echo json_encode([
    "status" => "success",
    "authToken" => $authToken,
    "librariesList" => $booksOnlyLibrariesList
]);
