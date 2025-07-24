<?php
// existingSeriesFetcher.php

// -----------------------------------------------------------------------------
// This script fetches book or series metadata from audimeta.de based on input.
// -----------------------------------------------------------------------------

header('Content-Type: application/json');

// -----------------------------------------------------------------------------
// Step 1: Read and validate incoming JSON payload
// -----------------------------------------------------------------------------

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Validate the input is a proper JSON object
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON input'
    ]);
    exit;
}

// Extract and sanitize input fields
$type = $input['type'] ?? 'book';     // 'book' or 'series'
$asin = trim($input['asin'] ?? '');
$region = strtolower(trim($input['region'] ?? 'uk')); // Default to UK

// Validate required fields
if (!$type || !$asin || !$region) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required fields: type, asin, or region'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 2: Build the correct URL for the audimeta.de API
// -----------------------------------------------------------------------------

if ($type === 'book') {
    $endpoint = "https://audimeta.de/book/{$asin}?cache=true&region={$region}";
} else {
    $endpoint = "https://audimeta.de/series/{$asin}/books?region={$region}&cache=true";
}

// -----------------------------------------------------------------------------
// Step 3: Perform cURL request to audimeta
// -----------------------------------------------------------------------------

$curl = curl_init($endpoint);

curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
        'User-Agent: AudibleMetaBot/1.0 (+https://seriescomplete.lily-pad.uk)'
    ]
]);

$response = curl_exec($curl);
$httpStatus = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

// -----------------------------------------------------------------------------
// Step 4: Return response with appropriate status
// -----------------------------------------------------------------------------

http_response_code($httpStatus);
echo $response;
