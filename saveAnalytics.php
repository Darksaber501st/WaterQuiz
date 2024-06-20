<?php
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);

    // Globals
    $spreadsheetID = '1YdRqhkFP_H3tSCcHCYRrDyvS9pL7P_f5zSXUvNJ9aJI'; //TODO hide in prod
    $dataSheet = 'TestPOST';

    // Function to update values in Google Sheets
    function updateSheetValues($spreadsheetID, $range, $values)
    {
        // Define your Google Sheets API endpoint
        $apiEndpoint = 'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}&key=AIzaSyBcQujstP6-SD07c49BDDx6sorVlZMXdG4'; //TODO remove API key from prod
        // Set the request URL
        $url = str_replace(['{SPREADSHEET_ID}', '{RANGE}'], [$spreadsheetID, $range], $apiEndpoint);
        // Prepare the data to be sent
        $data = array(
            'values' => $values
        );
        // Initialize cURL
        $ch = curl_init();
        // Set the cURL options
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        // Execute the cURL request
        $response = curl_exec($ch);
        // Close cURL
        curl_close($ch);
        // Check if the request was successful
        if ($response !== false) {
            // success
        } else {
            // failure - TODO maybe some error handling?
            return false;
        }
        return $response;
    }

    // Function to get values from Google Sheets
    function getSheetValues($spreadsheetID, $range)
    {
        // Define your Google Sheets API endpoint
        $apiEndpoint = 'https://sheets.googleapis.com/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}&key=AIzaSyBcQujstP6-SD07c49BDDx6sorVlZMXdG';
        // Set the request URL
        $url = str_replace(['{SPREADSHEET_ID}', '{RANGE}'], [$spreadsheetID, $range], $apiEndpoint);
        // Initialize cURL
        $ch = curl_init();
        // Set the cURL options
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        // Execute the cURL request
        $response = curl_exec($ch);
        // Close cURL
        curl_close($ch);

        // Check if the request was successful
        if ($response !== false) {
            // Decode the JSON response
            $data = json_decode($response, true);
            // Return the values
            //print_r($data);
            return $data;
        } else {
            return false;
        }
    }

    function main($spreadsheetID,$dataSheet) {
        // Retrieve the data from JavaScript local storage
        //$inData = json_decode($_POST['data'], true);
        $inData = json_decode($_GET['data'], true);
        echo "<br/>Got the following input data<br/>";
        print_r($inData);

        // get the row number from the provided data, increment by 1 (headers!)
        $row = intval($inData['questionNumber'])+1; //TODO add error handling?
        $range = $dataSheet.'!B'.$row.':J'.$row;

        // Get values from Google Sheets for the specified row and columns B to J
        $values = getSheetValues($spreadsheetID, $range);
        
        //setup response logging:
        //NEEDS TO MATCH SHEETS FORMAT
        //answers	correct	incorrect	AvgTimeBeforeAnswer	AvgTimeBeforeAnswerCorrect	AvgTimeBeforeAnswerIncorrect	AvgTimeAfterAnswer	AvgTimeAfterAnswerCorrect	AvgTimeAfterAnswerIncorrect

        if ($values !== false) {

            echo "<br/>Got the following data from Google Sheets<br/>";
            print_r($values);

            // Process the values
            $outData = array(
                'answers' => $values[0],
                'correct' => $values[1],
                'incorrect' => $values[2],
                'AvgTimeBeforeAnswer' => $values[3],
                'AvgTimeBeforeAnswerCorrect' => $values[4],
                'AvgTimeBeforeAnswerIncorrect' => $values[5],
                'AvgTimeAfterAnswer' => $values[6],
                'AvgTimeAfterAnswerCorrect' => $values[7],
                'AvgTimeAfterAnswerIncorrect' => $values[8],
            );

            // increment accordingly
            $outData['answers'] += 1;
            if ($inData['answerResult'] == true) {
                $outData['AvgTimeBeforeAnswerCorrect'] = ($outData['AvgTimeBeforeAnswerCorrect']*$outData['correct'] + $inData['timeSpentBefore']) / ($outData['correct']+1);
                $outData['AvgTimeAfterAnswerCorrect'] = ($outData['AvgTimeAfterAnswerCorrect']*$outData['correct'] + $inData['timeSpentAfter']) / ($outData['correct']+1);
                $outData['correct'] += 1;
            } else {
                $outData['AvgTimeBeforeAnswerIncorrect'] = ($outData['AvgTimeBeforeAnswerIncorrect']*$outData['incorrect'] + $inData['timeSpentBefore']) / ($outData['incorrect']+1);
                $outData['AvgTimeAfterAnswerIncorrect'] = ($outData['AvgTimeAfterAnswerIncorrect']*$outData['incorrect'] + $inData['timeSpentAfter']) / ($outData['incorrect']+1);
                $outData['incorrect'] +=1;
            }
            $outData['AvgTimeBeforeAnswer'] = ($outData['AvgTimeBeforeAnswer']*$outData['answers'] + $inData['timeSpentBefore']) / ($outData['answers']+1);
            $outData['AvgTimeAfterAnswer'] = ($outData['AvgTimeAfterAnswer']*$outData['answers'] + $inData['timeSpentAfter']) / ($outData['answers']+1);
            $outData['answers'] += 1;
            
            /*
            $updateResult = updateSheetValues($spreadsheetID, $updateRange, $outData);
            if ($updateResult !== false) {
                echo "Data saved successfully to sheet '".$dataSheet."'!";
                // success
            } else {
                // failure - TODO maybe some error handling?
                echo "Data NOT saved successfully!";
            }
            */
            
            echo "<br/>Now have returned the following data<br/>";
            print_r($outData);

        } else {
            // TODO: error handling if needed
            echo "<br/>Data NOT pulled successfully!<br/>";
        }
        
    }

    main($spreadsheetID,$dataSheet);
?>

