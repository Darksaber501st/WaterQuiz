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
let onlyComplete = true;
var debugLevel = 0; // 0: errors only, 1: errors and major steps, 2+: verbose
var slider = document.getElementById("difficultyRange");
var output = document.getElementById("difficultyValue");
var centerContent;
var correctFeedback;
var incorrectFeedback;
var gameColStatus = "single";

var difficultyDict ={
    1:{"label":"Easy", "displayColor":"green", "max-points":10},
    2:{"label":"Medium", "displayColor":"orange", "max-points":20},
    3:{"label":"Hard", "displayColor":"red", "max-points":30}
}

//CONSTANTS
const MAX_QUESTIONS = 6;
const TRANSITION_TIME =.2;//seconds
const DISPLAY_TIMEOUT_MS=200;//milliseconds


window.addEventListener("resize", checkGutterHeight);
window.onload = (event) => {
  const urlParams = new URLSearchParams(window.location.search);
  debugLevel = parseInt(urlParams.get('debug')); // enables console logging
  debugLog(`DEBUG: Debug level set to: ${debugLevel}`);
  centeredContainer.classList.add('hidden');
  //loaderContainer.classList.add('hidden');
  document.getElementById("instructionsOverlayOuter").classList.remove('hidden');
           
  document.getElementById("startGameBtn").addEventListener("click", function() {
    document.getElementById("instructionsOverlayOuter").classList.add('hidden');
    startGame();
  });
  checkGutterHeight();
};

// Fixes gutter heights for flexbox layout
function checkGutterHeight() {
    const bottombar = document.getElementById("bottom-bar");
    const topbar = document.getElementById("top-bar");
    const heightB = bottombar.offsetHeight;
    const heightT = topbar.offsetHeight;
    const heightG = window.screen.height - heightB - heightT;

    game.style.height = heightG + "px";
    fixFlexBox();
}

function fixFlexBox() {
    var newScale = game.offsetHeight/game.scrollHeight;
    console.log("Offset Height: ",game.offsetHeight);
    console.log("Scroll Height: ",game.scrollHeight);
    console.log("New scale: ",newScale);
    newScale = newScale * .9;
    console.log("FS New scale: ",newScale);
    game.style.transform = "scale(" + newScale + ")";
}

function debugLog(message, object=null) {
    if ( message.search("ERROR") == 0) { console.error(message); if (object != null) { console.error(object); } }
    else if ( message.search("WARNING") == 0) { console.warn(message); if (object != null) { console.warn(object);} }
    else if (debugLevel > 0 && message.search("DEBUG") == 0) { console.log(message); if (object != null) { console.log(object);} }
    else if (debugLevel > 1 && message.search("VERBOSE") == 0) { console.log(message); if (object != null) { console.log(object);} }
}

function startGame() {
    debugLog("DEBUG: Starting game");
    document.getElementById("advanceQBtn").addEventListener("click",stepForwards);
    questionCounter = 0;
    score = 0;
    game.classList.remove('hidden');
    output.innerHTML = difficultyDict[slider.value]['label'];
    output.style.color = difficultyDict[slider.value]['displayColor'];
    debugLog("DEBUG: Getting question data from database");
    readTextFile("../assets/questions.json", function(text){
        questionDB = JSON.parse(text);
        originalQuestionDB = JSON.parse(JSON.stringify(questionDB)); // ugly but works on old browsers. structuredClone is too new to be reliable
        getNewQuestions();
        $(document).foundation();
    });
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
    if (questionCounter >= MAX_QUESTIONS) {
        debugLog("DEBUG: Game over, moving to score page");
        //throw new Error("Something went badly wrong!");
        localStorage.setItem('mostRecentScore', score); // score is the final score
        return window.location.assign('/showScores.html'); //TODO replace
    } else if (questionDB.length === 0) {
        throw new Error("Could not get questions from database!");
    } else {
        debugLog("DEBUG: Getting new questions");
        questionCounter++;

        // Update the progress bar
        progressBarFull.style.width = `${(questionCounter / MAX_QUESTIONS) * 100}%`;

        // Get all questions
        var completeQuestions = {};
        for (const curDifficulty in {'Easy':1,'Medium':2,'Hard':3}){
            var curCompleteQuestions;
            var curQuestions = questionDB.filter(function(item){ return item.difficulty==curDifficulty;});
            if (onlyComplete) {
                curQuestions = curQuestions.filter(function(item){ return item['qc_valid?']=="FULL";});
            }
            curCompleteQuestions = curQuestions.filter(function(item){ return item['qc_valid?']=="FULL";});
            completeQuestions[curDifficulty]=curCompleteQuestions.length;
        }
        debugLog("VERBOSE: Complete questions: ",completeQuestions);
        for (const curDifficulty in {'Easy':1,'Medium':2,'Hard':3}){
            var used = false;
            var curQuestions = questionDB.filter(function(item){ return item.difficulty==curDifficulty;});
            debugLog(`VERBOSE: curQuestions for difficulty ${(curDifficulty)}: `,curQuestions);
            var questionIndex = Math.floor(Math.random() * curQuestions.length);
            debugLog(`VERBOSE: questionIndex for difficulty ${(curDifficulty)}: `,questionIndex);
            if (prioritizeComplete) {
                var curAvailQs = 0;
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

    if (debugLevel > 0) { console.log(currentQuestion);}

    centerContent= currentQuestion['centerContent'];
    correctFeedback= currentQuestion['correctFeedback'];
    incorrectFeedback= currentQuestion['incorrectFeedback'];
    let divResponse = [
        {"name": "CenterContent", "div": centerContentDiv, "default": "CenterContent!"},
        {"name": "CorrectFeedback", "div": correctFeedbackDiv, "default": "Correct!"},
        {"name": "IncorrectFeedback", "div": incorrectFeedbackDiv, "default": "Incorrect :-("}
    ];
    let fillIns = [centerContent, correctFeedback, incorrectFeedback];
    let idx = -1;
    var fillIn;
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
    feedbackDiv.style.display = 'none';
    resetDisplayStyle();
    acceptingAnswers = true;
    slider.disabled = false;
};

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
    //logQuestionTimeAndResult();
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
    //fixFlexBox();
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

function incrementNumberVisually(targetElement, startNumber, endNumber, duration) {
    debugLog("DEBUG: Increasing score and playing sound ");
    var audio = new Audio('../assets/success.mp3');
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
        //centerContentDiv,
        progressText,
        document.getElementById('progressBar'),
        document.getElementById('difficultyText'),
        document.getElementById('sliderContainer')
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
    switchToTwoColumnLayoutIfNeeded();
    fixFlexBox();
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
        //centerContentDiv,
        progressText,
        document.getElementById('progressBar'),
        document.getElementById('difficultyText'),
        document.getElementById('sliderContainer'),
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
     revertToSingleColumnLayoutIfNeeded();
     fixFlexBox();
}

slider.oninput = function() {
    output.innerHTML = difficultyDict[slider.value]['label'];
    output.style.color = difficultyDict[slider.value]['displayColor'];
    //adjust question
    acceptingAnswers = false;
    displayQuestion();
}

function getScreenRotation() {
    if (window.matchMedia("(orientation: portrait)").matches) {
        return "portrait";
    } else if (window.matchMedia("(orientation: landscape)").matches) {
        return "landscape";
    } else {
        return "unknown";
    }
}

function switchToTwoColumnLayoutIfNeeded() {
    const curRot = getScreenRotation();
    if (curRot === "landscape" && gameColStatus === "single") {
        game.classList.remove('flex-column');
        // Create left column div
        const leftColumnDiv = document.createElement('div');
        leftColumnDiv.id = 'leftColumn';
        leftColumnDiv.classList.add('flex-column','justify-center','split-col');
        leftColumnDiv.style.float = 'left';
        leftColumnDiv.style.width = '50%';

        // Create right column div
        const rightColumnDiv = document.createElement('div');
        rightColumnDiv.id = 'rightColumn';
        rightColumnDiv.classList.add('flex-column','justify-center','split-col');
        rightColumnDiv.style.float = 'right';
        rightColumnDiv.style.width = '50%';

        // Move all elements except the feedback container to the left column
        const gameChildren = game.children;
        var idArray = [];
        for (var child of gameChildren) {
            idArray.push(child.id);
        }
        const numKids = gameChildren.length
        var move;
        for (var child of idArray) {
            move = true;
            if (child === 'feedbackContainer') {
                move = false;
            }
            if (move) {
                console.log("Moving child: ",child);
                leftColumnDiv.appendChild(document.getElementById(child));
            } else {
                console.log("Skipping feedback container");
            }
        }

        // Move the feedback container to the right column
        const feedbackContainer = document.getElementById('feedbackContainer');
        console.log("Moving feedback container");
        rightColumnDiv.appendChild(feedbackContainer);

        // Clear the game div
        game.innerHTML = '';

        // Append the left and right columns to the game div
        game.appendChild(leftColumnDiv);
        game.appendChild(rightColumnDiv);
        var elements = document.getElementsByClassName('hud-element');
        const hud = document.getElementById('hud');
        //hud.style.removeProperty('grid-template-columns');
        hud.style.setProperty('grid-template-columns','1fr');
        for (var element of elements) {
            //element.style.setProperty('max-width','25%');
        }
        /*document.getElementById('correctFeedback').classList.add('flex-row');
        document.getElementById('incorrectFeedback').classList.add('flex-row');*/
        gameColStatus = "double";
    } else {

    }
}

function revertToSingleColumnLayoutIfNeeded() {
    const curRot = getScreenRotation();
    if (curRot === "landscape" && gameColStatus === "double") {
        const gameChildren = game.children;
        const leftColumnDiv = document.getElementById('leftColumn');
        const rightColumnDiv = document.getElementById('rightColumn');

        
        const leftChildren = leftColumnDiv.children;
        const rightChildren = rightColumnDiv.children;

        // Move all elements from the columns back to the game div
        while (leftColumnDiv.firstChild) {
            console.log("Moving child: ",leftColumnDiv.firstChild.id);
            game.appendChild(leftColumnDiv.firstChild);
        }
        while (rightColumnDiv.firstChild) {
            console.log("Moving child: ",rightColumnDiv.firstChild.id);
            game.appendChild(rightColumnDiv.firstChild);
        }

        /*document.getElementById('correctFeedback').classList.remove('flex-row');
        document.getElementById('incorrectFeedback').classList.remove('flex-row');*/
        game.classList.add('flex-column');
        const hud = document.getElementById('hud');
        //hud.style.removeProperty('grid-auto-columns');
        //hud.style.removeProperty('grid-template-columns');
        hud.style.setProperty('grid-template-columns','1fr 1fr 1fr');
        var elements = document.getElementsByClassName('hud-element');
        for (var element of elements) {
            //element.style.removeProperty('max-width');
        }
        // delete the columns from the DOM
        leftColumnDiv.remove();
        rightColumnDiv.remove();
        gameColStatus = "single";
    } else {

    }
}
