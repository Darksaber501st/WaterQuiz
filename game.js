const question = document.getElementById('question');
const centerContentDiv = document.getElementById('center-item');
const feedbackDiv = document.getElementById('feedbackContainer');
const correctFeedbackDiv = document.getElementById('correctFeedback');
const incorrectFeedbackDiv = document.getElementById('incorrectFeedback');
const choices = Array.from(document.getElementsByClassName('choice-text'));
const progressText = document.getElementById('progressText');
const scoreText = document.getElementById('score');
const progressBarFull = document.getElementById('progressBarFull');
const loaderContainer = document.getElementById('loaderSmallContainer');
const centeredContainer = document.getElementById('loaderFullContainer');
const game = document.getElementById('game');
let currentQuestion = {};
let acceptingAnswers = false;
let score = 0;
var questionStartTime;
var questionAnswerTime;
var curResult;
let questionCounter = 0;
let availableQuestions = [];
let usedQuestions = [];
let questionDB = [];
var originalQuestionDB;
let prioritizeComplete = true;
var debugLevel = 0; // 0: errors only, 1: errors and major steps, 2+: verbose
var slider = document.getElementById("difficultyRange");
var output = document.getElementById("difficultyValue");

var difficultyDict ={
    1:{"label":"Easy", "displayColor":"green", "max-points":10},
    2:{"label":"Medium", "displayColor":"orange", "max-points":20},
    3:{"label":"Hard", "displayColor":"red", "max-points":30}
}

//CONSTANTS
const MAX_QUESTIONS = 5;
const TRANSITION_TIME =.2;//seconds
const DISPLAY_TIMEOUT_MS=200;//milliseconds


window.onload = (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  debugLevel = parseInt(urlParams.get('debug')); // enables console logging
  debugLog(`DEBUG: Debug level set to: ${debugLevel}`);
  startGame();
};
/*
readTSV = async () => {
    try {
        const target = `/getData.php`; //file
        
        const res = await fetch(target, {
            method: 'get',
            headers: {
                'content-type': 'text/csv;charset=UTF-8',
            }
        });

        if (res.status === 200) {

            const data = await res.text();
            questionDB = tsvJSON(data);
            originalQuestionDB = JSON.parse(JSON.stringify(questionDB)); // ugly but works on old browsers. structuredClone is too new to be reliable
            getNewQuestions();

        } else {
            debugLog(`ERROR: Error in fetching questions, code ${res.status}`); //TODO: Add retry? Some level of "sorry, could not get questions"
        }
    } catch (err) {
        console.log(err) //TODO: Add real error handling
    }
}
*/
function debugLog(message, object=null) {
    if ( message.search("ERROR") == 0) { console.error(message); if (object != null) { console.error(object); } }
    else if ( message.search("WARNING") == 0) { console.warn(message); if (object != null) { console.warn(object);} }
    else if (debugLevel > 0 && message.search("DEBUG") == 0) { console.log(message); if (object != null) { console.log(object);} }
    else if (debugLevel > 1 && message.search("VERBOSE") == 0) { console.log(message); if (object != null) { console.log(object);} }
}

function startGame() {
    debugLog("DEBUG: Starting game");
    questionCounter = 0;
    score = 0;
    game.classList.remove('hidden');
    centeredContainer.classList.add('hidden');
    loaderContainer.classList.add('hidden');
    output.innerHTML = difficultyDict[slider.value]['label'];
    output.style.color = difficultyDict[slider.value]['displayColor'];
    debugLog("DEBUG: Getting question data from database");
    // questionDB } from './questions.json' assert { type: 'json' };
    //import { originalQuestionDB } from './questions.json' assert { type: 'json' };
    readTextFile("./questions.json", function(text){
        if (debugLevel > 0) { console.log(text); }
        questionDB = JSON.parse(text);
        if (debugLevel > 0) { console.log(questionDB); }
    });
    originalQuestionDB = JSON.parse(JSON.stringify(questionDB)); // ugly but works on old browsers. structuredClone is too new to be reliable
    getNewQuestions();
}

function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

function getNewQuestions () {
    if (questionDB.length === 0 || questionCounter >= MAX_QUESTIONS) {
        debugLog("DEBUG: Game over, moving to score page");
        throw new Error("Something went badly wrong!");
        localStorage.setItem('mostRecentScore', score); //TODO replace
        return window.location.assign('/showScores.html'); //TODO replace
    } else {
        debugLog("DEBUG: Getting new questions");
        questionCounter++;

        // Get all questions
        var completeQuestions = {};
        for (const curDifficulty in {'Easy':1,'Medium':2,'Hard':3}){
            var curQuestions = questionDB.filter(function(item){ return item.difficulty==curDifficulty;});
            var curCompleteQuestions = curQuestions.filter(function(item){ return item['qc_valid?']=="FULL";});
            completeQuestions[curDifficulty]=curCompleteQuestions.length;
        }
        debugLog("VERBOSE: Complete questions: ",completeQuestions);
        for (const curDifficulty in {'Easy':1,'Medium':2,'Hard':3}){
            var used = false;
            var curQuestions = questionDB.filter(function(item){ return item.difficulty==curDifficulty;});
            debugLog(`VERBOSE: curQuestions for difficulty ${(curDifficulty)}: `,curQuestions);
            var questionIndex = Math.floor(Math.random() * curQuestions.length);
            debugLog(`VERBOSE: questionIndex for difficulty ${(curDifficulty)}: `,questionIndex);
            /*do {
                
                if (usedQuestions.includes(curQuestions[questionIndex])) {
                    console.log("Need to re-roll, got question: ",curQuestions[questionIndex]);
                    console.log("UsedQuestions: ",usedQuestions);
                }
            } while (usedQuestions.includes(curQuestions[questionIndex]));*/
            if (prioritizeComplete) {
                curAvailQs = 0;
                if (typeof availableQuestions !== 'undefined') {
                    curAvailQs = availableQuestions.length;
                    debugLog("VERBOSE: Setting available questions: ",curAvailQs);
                } else { debugLog("ERROR: No available questions yet!");}
                debugLog(`VERBOSE: Current question status: ${curQuestions[questionIndex]['qc_valid?']}`);
                debugLog(`VERBOSE: Current question difficulty complete questions: ${completeQuestions[curDifficulty]}`);
                while (curAvailQs < completeQuestions[curDifficulty] && curQuestions[questionIndex]['qc_valid?']!="FULL") {
                    debugLog("VERBOSE: Re-rolling to prioritize complete questions");
                    do {
                        questionIndex = Math.floor(Math.random() * curQuestions.length);
                    } while (typeof curQuestions[questionIndex]['qc_valid?'] == 'undefined');
                    debugLog(`VERBOSE: Current question status: ${curQuestions[questionIndex]['qc_valid?']}`);
                    debugLog(`VERBOSE: Current question difficulty complete questions: ${completeQuestions[curDifficulty]}`);
                }
                debugLog("VERBOSE: Available questions: ",curAvailQs);
            }
            availableQuestions.push(curQuestions[questionIndex]);
            questionDB = questionDB.filter(function (question, ) { return question !== curQuestions[questionIndex]});
        }
        debugLog("Final question set this round: ",availableQuestions);
        displayQuestion();
        questionStartTime= new Date().getTime();
    }
};


function isStringValidHtml(html, mimeType) {
    debugLog(`VERBOSE: Checking validity of provided content: ${html}`);
    const domParser = new DOMParser();
      const doc = domParser.parseFromString(html, typeof mimeType == 'string' ? mimeType : 'application/xml');
      const parseError = doc.documentElement.querySelector('parsererror');
      const result = {
        isParseErrorAvailable: parseError !== null,
        isStringValidHtml: false,
        parsedDocument: ''
      };
    
      if (parseError !== null && parseError.nodeType === Node.ELEMENT_NODE) {
        result.parsedDocument = parseError.outerHTML;
      } else {
        result.isStringValidHtml = true;
        result.parsedDocument = typeof doc.documentElement.textContent === 'string' ? doc.documentElement.textContent : '';
      }
    
      return result;
};

function displayQuestion() {
    debugLog("DEBUG: Displaying question");
    currentQuestion = availableQuestions[slider.value-1];
    question.innerText = currentQuestion.question;

    choices.forEach((choice) => {
        const number = choice.dataset['number'];
        choice.innerText = currentQuestion['choice' + number];
    });

    centerContent= currentQuestion['centerContent'];
    correctFeedback= currentQuestion['correctFeedback'];
    incorrectFeedback= currentQuestion['incorrectFeedback'];
    needCenter = true;
    needCorrect = true;
    needIncorrect = true;
    divResponse = [
        {"name": "CenterContent", "div": centerContentDiv, "default": "CenterContent!"},
        {"name": "CorrectFeedback", "div": correctFeedbackDiv, "default": "Correct!"},
        {"name": "IncorrectFeedback", "div": incorrectFeedbackDiv, "default": "Incorrect :-("}
    ];
    fillIns = [centerContent, correctFeedback, incorrectFeedback];
    idx = -1;
    debugLog("VERBOSE: Filling out question content");
    for (const elem of fillIns) {
        idx++;
        fillIn = true;
        if (typeof elem !== 'undefined') {
            if (isStringValidHtml(elem) && elem.length > 0) {
                try {
                    divResponse[idx]["div"].innerHTML = elem;
                    debugLog(`VERBOSE: Got content for element '${divResponse[idx]["name"]}'`);
                    debugLog("VERBOSE: Good Content: ",elem);
                    fillIn = false;
                } catch (err) {
                    debugLog(`WARNING: Error parsing content for element '${divResponse[idx]["name"]}'`);
                    debugLog(err); // forces a default to fill in
                    debugLog("WARNING: Bad Content: ",elem);
                }
            } else { debugLog(`WARNING: Invalid content, defaulting for type '${divResponse[idx]["name"]}'`);}
        } else { debugLog(`WARNING: Undefined content, defaulting for type '${divResponse[idx]["name"]}'`);}
        if (fillIn) {
            divResponse[idx]["div"].innerText = divResponse[idx]["default"];
        }
    }
    resetDisplayStyle();
    feedbackDiv.style.display = 'none';
    //availableQuestions.splice(questionIndex, 1);
    acceptingAnswers = true;
    slider.disabled = false
};

function logQuestionTimeAndResult() {
    const currentTime = new Date().getTime();
    const preTimeSpent = currentTime - questionStartTime;
    const postTimeSpent = currentTime - questionAnswerTime;
    const questionIndex = originalQuestionDB.findIndex(q => q.question === currentQuestion.question);

    // Log time spent, answer result, and time before moving on to next question to local storage
    const questionLog = {
        questionNumber: questionIndex,
        timeSpentBefore: preTimeSpent,
        timeSpentAfter: postTimeSpent,
        answerResult: curResult
    };

    const outputBody = JSON.stringify(questionLog);
    debugLog("DEBUG: Logging question time and result: ",outputBody);

    fetch('saveAnalytics.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: outputBody
    })
    .then(response => {
        // TODO Handle response - probably unneeded
        if (debugLevel > 0) {console.log(response.body);}
    })
    .catch(error => {
        // TODO Handle error - log to console; it's analytics so nbd
        console.error("Error storing analytics: ",error);
    });
}

choices.forEach((choice) => {
    choice.addEventListener('click', (e) => {
        if (!acceptingAnswers) return;

        const selectedChoice = e.target;
        const selectedAnswer = selectedChoice.dataset['number'];

        const classToApply =
            selectedAnswer == currentQuestion.answer ? 'correct' : 'incorrect';

        selectedChoice.parentElement.classList.add(classToApply);
        var questionResult;
        if (classToApply === 'correct') {
            //incrementScore(difficultyDict[slider.value]['max-points']);
            incrementNumberVisually(scoreText,score,score+difficultyDict[slider.value]['max-points'],1000);
            questionResult = true;
        } else {
            markCorrectChoice();
            questionResult = false;
        }
        showFeedback(questionResult);
        curResult = questionResult;
        questionAnswerTime= new Date().getTime();
        hideForFeedback();
    });
});

function markCorrectChoice() {
    const correctChoice = choices.find(choice => choice.dataset.number === currentQuestion.answer);
    correctChoice.parentElement.classList.add('correct');
}

function stepForwards() {
    logQuestionTimeAndResult();
    debugLog("DEBUG: Moving on to next question");
    choices.forEach((choice) => {
        choice.parentElement.classList.remove('correct');
        choice.parentElement.classList.remove('incorrect');
    }   );
    
    availableQuestions = [];
    getNewQuestions();

}

function showFeedback(questionResult) {
    debugLog("DEBUG: Showing feedback");
    if (questionResult) {
        feedbackDiv.style.display = 'flex';
        correctFeedbackDiv.style.display = 'flex';
        incorrectFeedbackDiv.style.display = 'none';
    } else {
        feedbackDiv.style.display = 'flex';
        correctFeedbackDiv.style.display = 'none';
        incorrectFeedbackDiv.style.display = 'flex';
    }
    acceptingAnswers = false;
    slider.disabled = true
}

function changeBackgroundColor(div) {
    let currentColor = 0;
    const targetColor = 100;
    const duration = 10000; // 10 seconds
    const interval = 50; // 50 milliseconds

    const steps = Math.ceil(duration / interval);
    const stepSize = (targetColor - currentColor) / steps;

    const timer = setInterval(() => {
        currentColor += stepSize;
        div.style.backgroundColor = `rgb(0, ${currentColor}, 0)`;

        if (currentColor >= targetColor) {
            clearInterval(timer);
        }
    }, interval);
}
/*
incrementScore = (num) => {
    score += num;
    scoreText.innerText = score;
};*/

function incrementNumberVisually(targetElement, startNumber, endNumber, duration) {
    debugLog("DEBUG: Increasing score and playing sound ");
    var audio = new Audio('success.mp3');
    audio.play();
    highlightScore(true);
    const interval = 50; // 50 milliseconds
    const steps = Math.ceil(duration / interval);
    const stepSize = (endNumber - startNumber) / steps;
    let currentNumber = startNumber;
    const timer = setInterval(() => {
        currentNumber += stepSize;
        targetElement.innerText = Math.round(currentNumber);
        if (currentNumber >= endNumber) {
            clearInterval(timer);
            targetElement.innerText = endNumber;
        }
    }, interval);
    score=endNumber;
}


function hideForFeedback() {
    debugLog("DEBUG: Hiding elements for feedback");
    var elementsToFadeOut = [
        centerContentDiv,
        progressText,
        document.getElementById('progressBar'),
        document.getElementById('difficultyText'),
        document.getElementById('difficultyRange')
    ];

    choices.forEach((choice) => {
        if (!(choice.parentElement.classList.contains('correct') || choice.parentElement.classList.contains('incorrect'))) {
            elementsToFadeOut.push(choice.parentElement);
        }
    });

    elementsToFadeOut.forEach((element) => {
        element.style.transition = `all ${TRANSITION_TIME}s`;
        element.style.display = 'none';

    });
    
    document.getElementById('choiceGrid').style.display = 'flex';
};

function highlightScore(toggle) {
    if (toggle){
        scoreText.style.transition = `all ${TRANSITION_TIME}s`;
        scoreText.style.border = '1px solid green';
        scoreText.style.boxShadow= "0 0.4rem 1.4rem 0 green";
    } else {
        scoreText.style.transition = `all ${TRANSITION_TIME}s`;
        scoreText.style.border = 'none';
        scoreText.style.boxShadow= "none";
    }
}

function resetDisplayStyle() {
    debugLog("DEBUG: Resetting display");
    const elementsToFadeIn = [
        centerContentDiv,
        progressText,
        document.getElementById('progressBar'),
        document.getElementById('difficultyText'),
        document.getElementById('difficultyRange'),
        document.getElementById('choiceGrid')
    ];

    choices.forEach((choice) => {
        if (choice.parentElement.style.display == "none") {
            elementsToFadeIn.push(choice.parentElement);
        }
    });

    elementsToFadeIn.forEach((element) => {
        element.style.transition = `all ${TRANSITION_TIME}s`;
        element.style.display = null;
     });
     highlightScore(false);
}

slider.oninput = function() {
    output.innerHTML = difficultyDict[slider.value]['label'];
    output.style.color = difficultyDict[slider.value]['displayColor'];
    //adjust question
    acceptingAnswers = false;
    displayQuestion();
}
/*
function tsvJSON(tsv){
  debugLog("DEBUG: Parsing response from question database");
  var lines=tsv.split("\n");
  var result = [];
  var headers=lines[0].split("\t");
  for(var i=1;i<lines.length;i++){
      var obj = {};
      var currentline=lines[i].split("\t");
      doPush = true;
      for(var j=0;j<headers.length;j++){
          obj[headers[j]] = currentline[j];
          if (headers[j] == "qc_valid?") {
            if( currentline[j] == "FALSE" || currentline[j] == false) {
                doPush = false;
            }
          }
      }
      if (doPush) {
        result.push(obj);
      } else {
        debugLog(`WARNING: Skipping invalid question with text: '${currentline[0]}'`);
      }
  }

  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
  var dlAnchorElem = document.getElementById('downloadAnchorElem');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", "questions.json");
  dlAnchorElem.click();
  return result; //JSON


}*/