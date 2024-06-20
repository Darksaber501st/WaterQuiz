<?php

$url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRxQfmsMDnXSFRLzq9emTYZ9xFox-_tJZ2scE0iwrFlPXCtckShbDaOVmlHwQqKCyATTTAdRl8aK7Vs/pub?gid=0&single=true&output=tsv";

// Function to retrieve CSV data from a URL
function getTSVData($url) {
    $tsvData = file_get_contents($url);
    return $tsvData;
}

// Get the CSV data
$tsvData = getTSVData($url);

// Print the CSV data
echo $tsvData;

?>