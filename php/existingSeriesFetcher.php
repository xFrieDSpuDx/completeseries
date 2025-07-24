<?php
// existingSeriesFetcher.php

// Set response type to JSON
header('Content-Type: application/json');

// -----------------------------------------------------------------------------
// Step 1: Read and validate input from client
// -----------------------------------------------------------------------------

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Validate that input is a valid JSON object
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit;
}

// Extract and sanitize required fields
$serverUrl = rtrim($input['url'] ?? '', '/');
$username = trim($input['username'] ?? '');
$password = trim($input['password'] ?? '');

// Ensure required fields are present
if (!$serverUrl || !$username || !$password) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required fields: url, username, or password'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 2: Authenticate with Audiobookshelf API
// -----------------------------------------------------------------------------

$loginUrl = "$serverUrl/login";
$loginPayload = json_encode([
    'username' => $username,
    'password' => $password
]);

// Initialize cURL for login request
$loginCurl = curl_init($loginUrl);
curl_setopt_array($loginCurl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $loginPayload
]);

$loginResponse = curl_exec($loginCurl);
$loginStatus = curl_getinfo($loginCurl, CURLINFO_HTTP_CODE);
curl_close($loginCurl);

// Handle failed login
if ($loginStatus < 200 || $loginStatus >= 300) {
    http_response_code($loginStatus);
    echo json_encode([
        'status' => 'error',
        'message' => 'Login failed',
        'details' => $loginResponse
    ]);
    exit;
}

// Parse login response for token and library ID
$loginData = json_decode($loginResponse, true);
$libraryId = $loginData['userDefaultLibraryId'] ?? null;
$authToken = $loginData['user']['token'] ?? null;

if (!$libraryId || !$authToken) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing library ID or token in login response'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 3: Fetch all series with pagination
// -----------------------------------------------------------------------------

$seriesFirstASIN = []; // First book ASIN per series
$seriesAllASIN = [];   // All books ASINs across all series

$limit = 20;
$page = 0;
$totalSeriesCount = null;

do {
    $seriesUrl = "$serverUrl/api/libraries/$libraryId/series?limit=$limit&page=$page";

    $seriesCurl = curl_init($seriesUrl);
    curl_setopt_array($seriesCurl, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer $authToken"]
    ]);

    $seriesResponse = curl_exec($seriesCurl);
    $seriesStatus = curl_getinfo($seriesCurl, CURLINFO_HTTP_CODE);
    curl_close($seriesCurl);

    // Handle fetch failure
    if ($seriesStatus < 200 || $seriesStatus >= 300) {
        http_response_code($seriesStatus);
        echo json_encode([
            'status' => 'error',
            'message' => "Failed to fetch series (page $page)",
            'details' => $seriesResponse
        ]);
        exit;
    }

    $seriesData = json_decode($seriesResponse, true);
    $seriesList = $seriesData['results'] ?? [];

    // Record total series count on first request
    if ($totalSeriesCount === null && isset($seriesData['total'])) {
        $totalSeriesCount = $seriesData['total'];
    }

    foreach ($seriesList as $series) {
        $seriesName = $series['name'] ?? 'Unknown Series';
        $books = $series['books'] ?? [];

        // Store first book's metadata in seriesFirstASIN
        if (!empty($books)) {
            $firstMeta = $books[0]['media']['metadata'] ?? [];
            $seriesFirstASIN[] = [
                'series' => $seriesName,
                'title' => $firstMeta['title'] ?? 'Unknown Title',
                'asin' => $firstMeta['asin'] ?? 'Unknown ASIN'
            ];
        }

        // Store all books' metadata in seriesAllASIN
        foreach ($books as $book) {
            $meta = $book['media']['metadata'] ?? [];
            $seriesAllASIN[] = [
                'series' => $seriesName,
                'title' => $meta['title'] ?? 'Unknown Title',
                'asin' => $meta['asin'] ?? 'Unknown ASIN'
            ];
        }
    }

    $page++;
} while (count($seriesFirstASIN) < $totalSeriesCount);

// -----------------------------------------------------------------------------
// Step 4: Respond with structured result
// -----------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'seriesFirstASIN' => $seriesFirstASIN,
    'seriesAllASIN' => $seriesAllASIN
]);
