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
$authToken = $input['authToken'] ?? '';
$librariesList = $input['libraries'] ?? [];

// Ensure required fields are present
if (!$serverUrl || !$authToken || !$librariesList) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required fields: url, authentication token, or libraries list'
    ]);
    exit;
}

// -----------------------------------------------------------------------------
// Step 2: Fetch all series with pagination
// -----------------------------------------------------------------------------

$seriesFirstASIN = [];
$seriesAllASIN = [];

$limit = 20;

foreach ($librariesList as $library) {
    $libraryId = $library['id'] ?? null;
    if (!$libraryId) continue;

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

        if ($seriesStatus < 200 || $seriesStatus >= 300) {
            http_response_code($seriesStatus);
            echo json_encode([
                'status' => 'error',
                'message' => "Failed to fetch series (page $page) from library $libraryId",
                'details' => $seriesResponse
            ]);
            exit;
        }

        $seriesData = json_decode($seriesResponse, true);
        $seriesList = $seriesData['results'] ?? [];

        if ($totalSeriesCount === null && isset($seriesData['total'])) {
            $totalSeriesCount = $seriesData['total'];
        }

        foreach ($seriesList as $series) {
            $seriesName = $series['name'] ?? 'Unknown Series';
            $books = $series['books'] ?? [];

            if (!empty($books)) {
                $firstMeta = $books[0]['media']['metadata'] ?? [];
                $seriesFirstASIN[] = [
                    'series' => $seriesName,
                    'title' => $firstMeta['title'] ?? 'Unknown Title',
                    'asin' => $firstMeta['asin'] ?? 'Unknown ASIN'
                ];
            }

            foreach ($books as $book) {
                $meta = $book['media']['metadata'] ?? [];
                $bookSeriesName = $meta['seriesName'] ?? 'Unknown Series';
                $bookHashPosition = strpos($bookSeriesName, '#');
                $bookSeriesPosition = ($bookHashPosition !== false)
                    ? trim(substr($bookSeriesName, $bookHashPosition + 1))
                    : "N/A";
                $seriesAllASIN[] = [
                    'series' => $seriesName,
                    'title' => $meta['title'] ?? 'Unknown Title',
                    'asin' => $meta['asin'] ?? 'Unknown ASIN',
                    'subtitle' => $meta['subtitle'] ?? 'No Subtitle',
                    'seriesPosition' => $bookSeriesPosition
                ];
            }
        }

        $page++;
    } while (count($seriesFirstASIN) < $totalSeriesCount);
}

// -----------------------------------------------------------------------------
// Step 3: Respond with structured result
// -----------------------------------------------------------------------------

echo json_encode([
    'status' => 'success',
    'seriesFirstASIN' => $seriesFirstASIN,
    'seriesAllASIN' => $seriesAllASIN
]);
