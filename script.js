/**
 * @typedef {Object} QuizQuestion
 * @property {string} question - The question text displayed to the user.
 * @property {string[]} answers - The available answer options.
 * @property {number} correctIndex - The zero-based index of the correct answer.
 */

const DEFAULT_QUESTIONS_URL = "questions/questions.json";
const START_HEADER_IMAGE = "img/learning.jpg";
const QUIZ_HEADER_IMAGE = "img/learning.jpg";
const SOUND_VOLUME = 0.2;

/******************************************************************************
 * App State
 *****************************************************************************/

const appState = {
  /** @type {QuizQuestion[]} */
  questions: [],
  currentQuestionIndex: 0,
  correctAnswers: 0,
  hasAnsweredCurrentQuestion: false,
  soundEnabled: false,
  jsonLoadedModalInstance: null,
  jsonLoadedModalTimerId: null,
  /** @type {{ correct: HTMLAudioElement | null, wrong: HTMLAudioElement | null }} */
  sounds: {
    correct: null,
    wrong: null,
  },
};

/******************************************************************************
 * DOM Cache
 *****************************************************************************/

const elements = {
  soundToggleButton: null,
  soundIcon: null,
  jsonLoadedModal: null,
  jsonLoadedModalMessage: null,
  screenImage: null,
  statusAlert: null,
  startScreen: null,
  quizScreen: null,
  resultScreen: null,
  startInfoText: null,
  questionFileInput: null,
  loadFileButton: null,
  startButton: null,
  currentQuestionNumber: null,
  maxQuestionNumber: null,
  scorePill: null,
  progressBar: null,
  questionText: null,
  answersContainer: null,
  nextButton: null,
  resultCorrectCount: null,
  resultTotalCount: null,
  resultPercent: null,
  restartButton: null,
  backToStartButton: null,
};

/******************************************************************************
 * Initialization
 *****************************************************************************/

/**
 * Initializes the quiz app after the DOM has loaded.
 * @returns {Promise<void>}
 */
async function initializeQuizApp() {
  cacheDomElements();
  initializeBootstrapUi();
  bindUiEvents();
  initializeAudioEffects();
  updateSoundToggleButton();
  await loadDefaultQuestions();
  showStartScreen();
}

/**
 * Caches frequently used DOM nodes to avoid repeated queries.
 * @returns {void}
 */
function cacheDomElements() {
  elements.soundToggleButton = document.getElementById("sound-toggle-button");
  elements.soundIcon = document.getElementById("sound-icon");
  elements.jsonLoadedModal = document.getElementById("json-loaded-modal");
  elements.jsonLoadedModalMessage = document.getElementById("json-loaded-modal-message");
  elements.screenImage = document.getElementById("screen-image");
  elements.statusAlert = document.getElementById("status-alert");
  elements.startScreen = document.getElementById("start-screen");
  elements.quizScreen = document.getElementById("quiz-screen");
  elements.resultScreen = document.getElementById("result-screen");
  elements.startInfoText = document.getElementById("start-info-text");
  elements.questionFileInput = document.getElementById("question-file-input");
  elements.loadFileButton = document.getElementById("load-file-button");
  elements.startButton = document.getElementById("start-button");
  elements.currentQuestionNumber = document.getElementById("current-question-number");
  elements.maxQuestionNumber = document.getElementById("max-question-number");
  elements.scorePill = document.getElementById("score-pill");
  elements.progressBar = document.getElementById("progress-bar");
  elements.questionText = document.getElementById("question-text");
  elements.answersContainer = document.getElementById("answers-container");
  elements.nextButton = document.getElementById("next-button");
  elements.resultCorrectCount = document.getElementById("result-correct-count");
  elements.resultTotalCount = document.getElementById("result-total-count");
  elements.resultPercent = document.getElementById("result-percent");
  elements.restartButton = document.getElementById("restart-button");
  elements.backToStartButton = document.getElementById("back-to-start-button");
}

/**
 * Initializes Bootstrap UI components used by the app.
 * @returns {void}
 */
function initializeBootstrapUi() {
  if (!window.bootstrap?.Modal || !elements.jsonLoadedModal) {
    return;
  }

  appState.jsonLoadedModalInstance = new window.bootstrap.Modal(elements.jsonLoadedModal, {
    backdrop: false,
    keyboard: true,
  });
}

/**
 * Wires up all UI event listeners.
 * @returns {void}
 */
function bindUiEvents() {
  elements.soundToggleButton.addEventListener("click", toggleSoundState);
  elements.startButton.addEventListener("click", startQuiz);
  elements.loadFileButton.addEventListener("click", loadQuestionsFromSelectedFile);
  elements.nextButton.addEventListener("click", goToNextQuestion);
  elements.restartButton.addEventListener("click", restartQuiz);
  elements.backToStartButton.addEventListener("click", showStartScreen);
}

/**
 * Initializes optional audio feedback for correct/wrong answers.
 * @returns {void}
 */
function initializeAudioEffects() {
  appState.sounds.correct = new Audio("audio/Homer_Simpson_Woohoo.mp3");
  appState.sounds.wrong = new Audio("audio/Homer_NEIN!.mp3");
  appState.sounds.correct.volume = SOUND_VOLUME;
  appState.sounds.wrong.volume = SOUND_VOLUME;
}

/******************************************************************************
 * Data Loading
 *****************************************************************************/

/**
 * Loads the default question set from `questions/questions.json`.
 * @returns {Promise<void>}
 */
async function loadDefaultQuestions() {
  try {
    const defaultQuestions = await fetchQuestionsFromUrl(DEFAULT_QUESTIONS_URL);
    applyQuestionSet(defaultQuestions);
    hideStatusAlert();
    updateStartInfoText(`Aktuell sind ${defaultQuestions.length} Standardfragen geladen.`);
  } catch (error) {
    applyQuestionSet([]);
    updateStartInfoText("Keine Standardfragen geladen.");
    showStatusAlert(
      "Standardfragen konnten nicht geladen werden. Lade eine eigene JSON-Datei.",
      "warning"
    );
  }
}

/**
 * Loads questions from a user-selected local JSON file.
 * @returns {Promise<void>}
 */
async function loadQuestionsFromSelectedFile() {
  const selectedFile = elements.questionFileInput.files?.[0];

  if (!selectedFile) {
    showStatusAlert("Bitte waehle zuerst eine JSON-Datei aus.", "warning");
    return;
  }

  try {
    const fileContent = await selectedFile.text();
    const parsedContent = JSON.parse(fileContent);
    const validatedQuestions = validateAndNormalizeQuestionJsonArray(parsedContent);

    applyQuestionSet(validatedQuestions);
    hideStatusAlert();
    updateStartInfoText(`Aktuell sind ${validatedQuestions.length} Fragen geladen.`);
    showPopupMessage(`JSON geladen: ${validatedQuestions.length} Fragen aus ${selectedFile.name}.`);
    showStartScreen();
  } catch (error) {
    showStatusAlert(
      "Datei konnte nicht gelesen werden. Bitte JSON-Format pruefen.",
      "danger"
    );
  }
}

/**
 * Fetches a JSON file and returns a validated quiz question set.
 * @param {string} url - Relative or absolute URL to a question JSON file.
 * @returns {Promise<QuizQuestion[]>}
 */
async function fetchQuestionsFromUrl(url) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Unable to fetch questions from ${url}.`);
  }

  const jsonContent = await response.json();
  return validateAndNormalizeQuestionJsonArray(jsonContent);
}

/**
 * Validates and normalizes a raw question set.
 * @param {unknown} rawQuestions - Untrusted parsed JSON content.
 * @returns {QuizQuestion[]}
 */
function validateAndNormalizeQuestionJsonArray(rawQuestions) {
  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error("Question set must be a non-empty array.");
  }

  return rawQuestions.map((rawQuestion, index) =>
    validateAndNormalizeQuestionJsonEntry(rawQuestion, index)
  );
}

/**
 * Converts one raw question object into a validated `QuizQuestion`.
 * @param {unknown} rawQuestion - Untrusted question object.
 * @param {number} index - Position of the question in the source array.
 * @returns {QuizQuestion}
 */
function validateAndNormalizeQuestionJsonEntry(rawQuestion, index) {
  if (!rawQuestion || typeof rawQuestion !== "object") {
    throw new Error(`Question at index ${index} is invalid.`);
  }

  const validatedQuestionShape = validateQuestionJsonShape(rawQuestion);
  if (validatedQuestionShape) {
    return validatedQuestionShape;
  }

  throw new Error(
    `Question at index ${index} has unsupported structure. Use { question, answers, correctIndex }.`
  );
}

/**
 * Validates a question object JSON shape.
 * Expected keys: `question`, `answers`, `correctIndex`.
 * @param {Record<string, unknown>} rawQuestion - Candidate object.
 * @returns {QuizQuestion | null}
 */
function validateQuestionJsonShape(rawQuestion) {
  if (
    typeof rawQuestion.question !== "string" ||
    !Array.isArray(rawQuestion.answers) ||
    typeof rawQuestion.correctIndex !== "number"
  ) {
    return null;
  }

  const questionText = rawQuestion.question.trim();
  const answers = rawQuestion.answers
    .filter((value) => typeof value === "string")
    .map((value) => value.trim());
  const correctIndex = Math.trunc(rawQuestion.correctIndex);

  if (!questionText || answers.length < 2) {
    throw new Error("Each question needs text and at least two answers.");
  }

  if (correctIndex < 0 || correctIndex >= answers.length) {
    throw new Error("`correctIndex` is outside the valid answer range.");
  }

  return {
    question: questionText,
    answers,
    correctIndex,
  };
}

/******************************************************************************
 * Quiz Flow
 *****************************************************************************/

/**
 * Applies a validated question set to the app state.
 * @param {QuizQuestion[]} questions - Validated questions.
 * @returns {void}
 */
function applyQuestionSet(questions) {
  appState.questions = questions;
  resetQuizProgress();
  updateQuestionCounters();
  updateStartButtonAvailability();
}

/**
 * Starts a new quiz run with the currently loaded question set.
 * @returns {void}
 */
function startQuiz() {
  if (appState.questions.length === 0) {
    showStatusAlert("Keine Fragen verfuegbar. Bitte JSON laden.", "warning");
    return;
  }

  resetQuizProgress();
  showQuizScreen();
  renderCurrentQuestion();
}

/**
 * Renders the current question and its answer options.
 * @returns {void}
 */
function renderCurrentQuestion() {
  const currentQuestion = getCurrentQuestion();
  if (!currentQuestion) {
    showResultScreen();
    return;
  }

  elements.questionText.textContent = currentQuestion.question;
  elements.answersContainer.innerHTML = "";

  currentQuestion.answers.forEach((answerText, answerIndex) => {
    const answerButton = createAnswerButton(answerText, answerIndex);
    elements.answersContainer.appendChild(answerButton);
  });

  elements.currentQuestionNumber.textContent = String(appState.currentQuestionIndex + 1);
  elements.maxQuestionNumber.textContent = String(appState.questions.length);
  elements.nextButton.disabled = true;
  elements.nextButton.textContent = isLastQuestion() ? "Ergebnis anzeigen" : "Naechste Frage";

  appState.hasAnsweredCurrentQuestion = false;
  updateScoreBadge();
  updateProgressBar();
}

/**
 * Creates an answer button element for one option.
 * @param {string} answerText - Text shown to the user.
 * @param {number} answerIndex - Zero-based answer index.
 * @returns {HTMLButtonElement}
 */
function createAnswerButton(answerText, answerIndex) {
  const answerButton = document.createElement("button");
  answerButton.type = "button";
  answerButton.className = "btn btn-outline-primary text-start answer-button";
  answerButton.dataset.answerIndex = String(answerIndex);
  answerButton.textContent = answerText;
  answerButton.addEventListener("click", handleAnswerSelection);
  return answerButton;
}

/**
 * Handles a click on an answer option and applies feedback styling.
 * @param {MouseEvent} event - DOM click event.
 * @returns {void}
 */
function handleAnswerSelection(event) {
  if (appState.hasAnsweredCurrentQuestion) {
    return;
  }

  const clickedButton = /** @type {HTMLButtonElement} */ (event.currentTarget);
  const selectedIndex = Number(clickedButton.dataset.answerIndex);
  const question = getCurrentQuestion();

  if (!question) {
    return;
  }

  appState.hasAnsweredCurrentQuestion = true;

  if (selectedIndex === question.correctIndex) {
    appState.correctAnswers += 1;
    playAudioEffect("correct");
  } else {
    playAudioEffect("wrong");
  }

  applyAnswerFeedback(selectedIndex, question.correctIndex);
  updateScoreBadge();
  elements.nextButton.disabled = false;
}

/**
 * Advances to the next question or to the result screen.
 * @returns {void}
 */
function goToNextQuestion() {
  if (!appState.hasAnsweredCurrentQuestion) {
    return;
  }

  if (isLastQuestion()) {
    showResultScreen();
    return;
  }

  appState.currentQuestionIndex += 1;
  renderCurrentQuestion();
}

/**
 * Restarts the quiz while keeping the loaded question set.
 * @returns {void}
 */
function restartQuiz() {
  startQuiz();
}

/**
 * Resets the mutable quiz progress state.
 * @returns {void}
 */
function resetQuizProgress() {
  appState.currentQuestionIndex = 0;
  appState.correctAnswers = 0;
  appState.hasAnsweredCurrentQuestion = false;
  updateScoreBadge();
  updateProgressBar();
}

/******************************************************************************
 * Screen Rendering
 *****************************************************************************/

/**
 * Displays the start screen and hides quiz/result screens.
 * @returns {void}
 */
function showStartScreen() {
  toggleScreens("start");
  setHeaderImage(START_HEADER_IMAGE);
}

/**
 * Displays the quiz screen and hides start/result screens.
 * @returns {void}
 */
function showQuizScreen() {
  toggleScreens("quiz");
  setHeaderImage(QUIZ_HEADER_IMAGE);
}

/**
 * Displays the result screen and renders final score details.
 * @returns {void}
 */
function showResultScreen() {
  toggleScreens("result");
  setHeaderImage(START_HEADER_IMAGE);

  const totalQuestions = appState.questions.length;
  const resultPercent = calculateResultPercent(appState.correctAnswers, totalQuestions);

  elements.resultCorrectCount.textContent = String(appState.correctAnswers);
  elements.resultTotalCount.textContent = String(totalQuestions);
  elements.resultPercent.textContent = buildResultMessage(resultPercent);

  elements.resultPercent.classList.remove("text-success", "text-warning", "text-danger");
  elements.resultPercent.classList.add(getResultColorClass(resultPercent));

  elements.progressBar.style.width = "100%";
  elements.progressBar.textContent = "100%";
}

/**
 * Toggles the three app screens by key.
 * @param {"start"|"quiz"|"result"} visibleScreen - Screen that should be visible.
 * @returns {void}
 */
function toggleScreens(visibleScreen) {
  elements.startScreen.classList.toggle("d-none", visibleScreen !== "start");
  elements.quizScreen.classList.toggle("d-none", visibleScreen !== "quiz");
  elements.resultScreen.classList.toggle("d-none", visibleScreen !== "result");
}

/******************************************************************************
 * UI Helpers
 *****************************************************************************/

/**
 * Applies visual feedback for selected and correct answers.
 * @param {number} selectedIndex - The selected answer index.
 * @param {number} correctIndex - The correct answer index.
 * @returns {void}
 */
function applyAnswerFeedback(selectedIndex, correctIndex) {
  const answerButtons = elements.answersContainer.querySelectorAll("button");

  answerButtons.forEach((buttonElement) => {
    const button = /** @type {HTMLButtonElement} */ (buttonElement);
    const currentIndex = Number(button.dataset.answerIndex);

    button.disabled = true;
    button.classList.remove("btn-outline-primary", "btn-outline-secondary");

    if (currentIndex === correctIndex) {
      button.classList.add("btn-success");
      return;
    }

    if (currentIndex === selectedIndex && selectedIndex !== correctIndex) {
      button.classList.add("btn-danger");
      return;
    }

    button.classList.add("btn-outline-secondary");
  });
}

/**
 * Updates top counters for question count and current score.
 * @returns {void}
 */
function updateQuestionCounters() {
  const totalQuestions = appState.questions.length;
  elements.maxQuestionNumber.textContent = String(totalQuestions);
}

/**
 * Enables or disables the start button based on available questions.
 * @returns {void}
 */
function updateStartButtonAvailability() {
  elements.startButton.disabled = appState.questions.length === 0;
}

/**
 * Updates the score badge in the quiz header.
 * @returns {void}
 */
function updateScoreBadge() {
  elements.scorePill.textContent = `${appState.correctAnswers} Punkte`;
}

/**
 * Updates the progress bar for the current question position.
 * @returns {void}
 */
function updateProgressBar() {
  const totalQuestions = appState.questions.length;
  const progressPercent =
    totalQuestions === 0
      ? 0
      : Math.round(((appState.currentQuestionIndex + 1) / totalQuestions) * 100);

  elements.progressBar.style.width = `${progressPercent}%`;
  elements.progressBar.textContent = `${progressPercent}%`;
}

/**
 * Shows a bootstrap alert message to communicate app status.
 * @param {string} message - Alert message text.
 * @param {"success"|"info"|"warning"|"danger"} type - Bootstrap alert variant.
 * @returns {void}
 */
function showStatusAlert(message, type) {
  elements.statusAlert.className = `alert alert-${type} mb-3`;
  elements.statusAlert.textContent = message;
}

/**
 * Hides the status alert area.
 * @returns {void}
 */
function hideStatusAlert() {
  elements.statusAlert.className = "alert d-none mb-3";
  elements.statusAlert.textContent = "";
}

/**
 * Updates the info text shown on the start screen.
 * @param {string} message - Message for the start hint area.
 * @returns {void}
 */
function updateStartInfoText(message) {
  elements.startInfoText.textContent = message;
}

/**
 * Shows a simple popup message for successful imports.
 * @param {string} message - Popup content.
 * @returns {void}
 */
function showPopupMessage(message) {
  if (!appState.jsonLoadedModalInstance || !elements.jsonLoadedModalMessage) {
    showStatusAlert(message, "success");
    return;
  }

  elements.jsonLoadedModalMessage.textContent = message;
  appState.jsonLoadedModalInstance.show();

  if (appState.jsonLoadedModalTimerId !== null) {
    window.clearTimeout(appState.jsonLoadedModalTimerId);
  }

  appState.jsonLoadedModalTimerId = window.setTimeout(() => {
    appState.jsonLoadedModalInstance?.hide();
    appState.jsonLoadedModalTimerId = null;
  }, 1400);
}

/**
 * Sets the header image shown at the top of the card.
 * @param {string} imagePath - Relative path to image.
 * @returns {void}
 */
function setHeaderImage(imagePath) {
  elements.screenImage.src = imagePath;
}

/**
 * Toggles global quiz sound playback on/off.
 * @returns {void}
 */
function toggleSoundState() {
  appState.soundEnabled = !appState.soundEnabled;
  updateSoundToggleButton();
}

/**
 * Updates the sound toggle icon and accessibility labels.
 * @returns {void}
 */
function updateSoundToggleButton() {
  const isEnabled = appState.soundEnabled;

  elements.soundToggleButton.setAttribute("aria-pressed", String(isEnabled));
  elements.soundToggleButton.setAttribute(
    "aria-label",
    isEnabled ? "Sound deaktivieren" : "Sound aktivieren"
  );
  elements.soundToggleButton.title = isEnabled ? "Sound an" : "Sound aus";

  elements.soundIcon.classList.toggle("bi-volume-up-fill", isEnabled);
  elements.soundIcon.classList.toggle("bi-volume-mute-fill", !isEnabled);
}

/******************************************************************************
 * Computation Helpers
 *****************************************************************************/

/**
 * Returns the currently active question.
 * @returns {QuizQuestion | undefined}
 */
function getCurrentQuestion() {
  return appState.questions[appState.currentQuestionIndex];
}

/**
 * Indicates whether the current question is the last one.
 * @returns {boolean}
 */
function isLastQuestion() {
  return appState.currentQuestionIndex >= appState.questions.length - 1;
}

/**
 * Calculates the result percentage.
 * @param {number} correctAnswers - Number of correct answers.
 * @param {number} totalQuestions - Number of total questions.
 * @returns {number}
 */
function calculateResultPercent(correctAnswers, totalQuestions) {
  if (totalQuestions === 0) {
    return 0;
  }

  return Math.round((correctAnswers / totalQuestions) * 100);
}

/**
 * Builds a human-readable result message for the final score.
 * @param {number} resultPercent - Result value from 0 to 100.
 * @returns {string}
 */
function buildResultMessage(resultPercent) {
  if (resultPercent >= 80) {
    return `Stark! ${resultPercent}% richtig.`;
  }

  if (resultPercent >= 50) {
    return `Solide! ${resultPercent}% richtig.`;
  }

  return `Weiter ueben! ${resultPercent}% richtig.`;
}

/**
 * Returns the bootstrap text color class for the result message.
 * @param {number} resultPercent - Result value from 0 to 100.
 * @returns {"text-success"|"text-warning"|"text-danger"}
 */
function getResultColorClass(resultPercent) {
  if (resultPercent >= 80) {
    return "text-success";
  }

  if (resultPercent >= 50) {
    return "text-warning";
  }

  return "text-danger";
}

/**
 * Plays one of the optional audio effects.
 * @param {"correct"|"wrong"} soundType - Sound key.
 * @returns {void}
 */
function playAudioEffect(soundType) {
  if (!appState.soundEnabled) {
    return;
  }

  const sound = appState.sounds[soundType];

  if (!sound) {
    return;
  }

  sound.currentTime = 0;
  sound.play().catch(() => {
    // Browser audio autoplay restrictions can block playback until user interaction.
  });
}

document.addEventListener("DOMContentLoaded", initializeQuizApp);




