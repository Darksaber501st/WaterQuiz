<?php
// Database connection details
$servername = "localhost";
$username = $_ENV["SQL_USER"];
$password = $_ENV["SQL_USER"];
$dbname = "your_database_name";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Get the username and score from the request
$username = $_POST['username'];
$score = $_POST['score'];

// Prepare and execute the SQL query
$stmt = $conn->prepare("INSERT INTO scores (username, score) VALUES (?, ?)");
$stmt->bind_param("si", $username, $score);
$stmt->execute();

// Check if the query was successful
if ($stmt->affected_rows > 0) {
    echo "Score saved successfully!";
} else {
    echo "Error saving score.";
}

// Close the statement and connection
$stmt->close();
$conn->close();
?>