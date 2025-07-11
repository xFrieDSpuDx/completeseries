<?php
header('Content-Type: application/json');

$type = $_GET['type'] ?? 'book'; // 'book' or 'series'
$asin = $_GET['asin'] ?? null;
$region = $_GET['region'] ?? 'uk';

if (!$asin || !in_array($type, ['book', 'series'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing parameters']);
    exit;
}

if ($type === 'book') {
    $url = "https://audimeta.de/book/{$asin}?cache=true&region={$region}";
} else {
    $url = "https://audimeta.de/series/{$asin}/books?region={$region}&cache=true";
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Accept: application/json']
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
echo $response;