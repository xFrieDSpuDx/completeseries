<?php
header('Content-Type: application/json');
$in = json_decode(file_get_contents('php://input'), true);

$serverUrl = rtrim($in['serverUrl'], '/');
$username = $in['username'];
$password = $in['password'];

// 1. Login
$ch = curl_init($serverUrl . '/login');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => json_encode(compact('username','password'))
]);
$loginResp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code < 200 || $code >= 300) {
    http_response_code($code);
    exit(json_encode(['message'=>'Login failed','details'=>$loginResp]));
}

$loginData = json_decode($loginResp, true);
$libId = $loginData['userDefaultLibraryId'] ?? null;
$token = $loginData['user']['token'] ?? null;

if (!$libId || !$token) {
    http_response_code(500);
    exit(json_encode(['message'=>'Missing ID or token in login response']));
}

// 2. Paginate through all series
$limit = 20;
$page = 0;
$total = null;
$seriesFirstASIN = [];
$seriesAllASIN = [];

do {
    $url = "{$serverUrl}/api/libraries/{$libId}/series?limit={$limit}&page={$page}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer {$token}"]
    ]);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code < 200 || $code >= 300) {
        http_response_code($code);
        exit(json_encode(['message'=>"Failed fetching series on page $page", 'details'=>$response]));
    }

    $data = json_decode($response, true);
    $results = $data['results'] ?? [];

    if ($total === null && isset($data['total'])) {
        $total = $data['total'];
    }

    foreach ($results as $series) {
        $seriesName = $series['name'] ?? 'Unknown Series';
        $books = $series['books'] ?? [];

        // First ASIN
        if (count($books) > 0) {
            $firstMeta = $books[0]['media']['metadata'] ?? [];
            $seriesFirstASIN[] = [
                'series' => $seriesName,
                'title' => $firstMeta['title'] ?? 'Unknown Title',
                'asin' => $firstMeta['asin'] ?? 'Unknown ASIN'
            ];
        }

        // All ASINs
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
} while (count($seriesFirstASIN) < $total);

// Final output (no audimeta fetching here anymore)
echo json_encode([
    'seriesFirstASIN' => $seriesFirstASIN,
    'seriesAllASIN' => $seriesAllASIN
]);
