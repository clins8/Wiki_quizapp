class QuizApp {
    constructor() {
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = []; // Track user answers for review
        this.timer = null;
        this.timeLeft = 10;
        this.questionResolved = false; // Guard to prevent race conditions
        this.autoAdvanceTimeout = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadQuestions();
    }

    bindEvents() {
        document.getElementById('start-btn').addEventListener('click', () => this.startQuiz());
        document.getElementById('restart-btn').addEventListener('click', () => this.restartQuiz());
        document.getElementById('review-btn').addEventListener('click', () => this.showReview());
        document.getElementById('back-to-results-btn').addEventListener('click', () => this.showResults());
        document.getElementById('restart-from-review-btn').addEventListener('click', () => this.restartQuiz());
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error('Failed to load questions');
            }
            this.questions = await response.json();
            document.getElementById('total-questions').textContent = this.questions.length;
            document.getElementById('total-score').textContent = this.questions.length;
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showError('Failed to load quiz questions. Please try again.');
        }
    }

    startQuiz() {
        if (this.questions.length === 0) {
            this.showError('No questions available. Please try again.');
            return;
        }
        
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.questionResolved = false;
        this.clearTimeouts();
        this.showScreen('quiz-screen');
        this.displayQuestion();
    }

    showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show the requested screen
        document.getElementById(screenId).classList.add('active');
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        this.questionResolved = false; // Reset guard for new question
        
        // Update question number
        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;
        
        // Update question text
        document.getElementById('question-text').textContent = question.q;
        
        // Create option buttons or finish button for last question
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.innerHTML = '';
        
        if (this.currentQuestionIndex === this.questions.length - 1) {
            // Last question - show finish button after options
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('button');
                optionBtn.className = 'option-btn';
                optionBtn.textContent = option;
                optionBtn.addEventListener('click', () => this.selectOption(index));
                optionsContainer.appendChild(optionBtn);
            });
            
            // Add finish button (initially hidden)
            const finishBtn = document.createElement('button');
            finishBtn.id = 'finish-btn';
            finishBtn.className = 'btn btn-primary';
            finishBtn.textContent = 'Finish Quiz';
            finishBtn.style.display = 'none';
            finishBtn.style.marginTop = '20px';
            finishBtn.addEventListener('click', () => {
                if (!this.questionResolved) return;
                this.showResults();
            });
            optionsContainer.appendChild(finishBtn);
        } else {
            question.options.forEach((option, index) => {
                const optionBtn = document.createElement('button');
                optionBtn.className = 'option-btn';
                optionBtn.textContent = option;
                optionBtn.addEventListener('click', () => this.selectOption(index));
                optionsContainer.appendChild(optionBtn);
            });
        }
        
        // Start timer
        this.startTimer();
    }

    selectOption(selectedIndex) {
        if (this.questionResolved) return; // Prevent multiple selections
        
        const question = this.questions[this.currentQuestionIndex];
        this.questionResolved = true; // Set guard
        
        // Stop timer and clear timeouts
        this.stopTimer();
        this.clearTimeouts();
        
        // Disable all option buttons
        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.style.pointerEvents = 'none';
        });
        
        // Highlight selected option and show correct answer
        optionBtns[selectedIndex].classList.add('selected');
        optionBtns[question.answer].classList.add('correct-answer');
        
        // Store user answer for review
        const isCorrect = selectedIndex === question.answer;
        this.userAnswers.push({
            question: question.q,
            options: question.options,
            userAnswer: selectedIndex,
            correctAnswer: question.answer,
            isCorrect: isCorrect
        });
        
        if (isCorrect) {
            this.score++;
        }
        
        // Show finish button if last question, otherwise auto-advance
        if (this.currentQuestionIndex === this.questions.length - 1) {
            const finishBtn = document.getElementById('finish-btn');
            if (finishBtn) {
                finishBtn.style.display = 'block';
            }
        } else {
            this.autoAdvanceTimeout = setTimeout(() => {
                this.nextQuestion();
            }, 2000); // 2 second delay to show feedback
        }
    }

    clearTimeouts() {
        if (this.autoAdvanceTimeout) {
            clearTimeout(this.autoAdvanceTimeout);
            this.autoAdvanceTimeout = null;
        }
    }
    
    startTimer() {
        this.timeLeft = 10;
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    
    updateTimerDisplay() {
        const timerText = document.getElementById('timer-text');
        const timerCircle = document.querySelector('.timer-circle');
        
        timerText.textContent = this.timeLeft;
        
        // Change timer color based on time left
        timerCircle.className = 'timer-circle';
        if (this.timeLeft <= 3) {
            timerCircle.classList.add('danger');
        } else if (this.timeLeft <= 5) {
            timerCircle.classList.add('warning');
        }
    }
    
    timeUp() {
        if (this.questionResolved) return; // Prevent race condition
        
        this.questionResolved = true; // Set guard
        this.stopTimer();
        this.clearTimeouts();
        
        const question = this.questions[this.currentQuestionIndex];
        
        // Disable all option buttons and show correct answer
        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            btn.style.pointerEvents = 'none';
        });
        if (optionBtns[question.answer]) {
            optionBtns[question.answer].classList.add('correct-answer');
        }
        
        // Store as unanswered (no selection made)
        this.userAnswers.push({
            question: question.q,
            options: question.options,
            userAnswer: -1, // -1 indicates no answer
            correctAnswer: question.answer,
            isCorrect: false
        });
        
        // Show finish button if last question, otherwise auto-advance
        if (this.currentQuestionIndex === this.questions.length - 1) {
            const finishBtn = document.getElementById('finish-btn');
            if (finishBtn) {
                finishBtn.style.display = 'block';
            }
        } else {
            this.autoAdvanceTimeout = setTimeout(() => {
                this.nextQuestion();
            }, 2000); // 2 second delay to show feedback
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.questions.length) {
            this.displayQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.showScreen('result-screen');
        
        // Display final score
        document.getElementById('final-score').textContent = this.score;
        
        // Calculate and display percentage
        const percentage = Math.round((this.score / this.questions.length) * 100);
        document.getElementById('percentage').textContent = percentage;
        
        // Change percentage color based on score
        const percentageElement = document.getElementById('percentage');
        if (percentage >= 80) {
            percentageElement.style.color = '#28a745';
        } else if (percentage >= 60) {
            percentageElement.style.color = '#ffc107';
        } else {
            percentageElement.style.color = '#dc3545';
        }
    }
    
    showReview() {
        this.showScreen('review-screen');
        this.displayReview();
    }
    
    displayReview() {
        const reviewContainer = document.getElementById('review-container');
        reviewContainer.innerHTML = '';
        
        this.userAnswers.forEach((answer, index) => {
            const reviewItem = document.createElement('div');
            reviewItem.className = `review-item ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            
            const statusIcon = answer.isCorrect ? '✓' : '✗';
            const statusText = answer.isCorrect ? 'Correct' : 'Incorrect';
            
            const userAnswerText = answer.userAnswer === -1 
                ? 'No answer (time up)' 
                : answer.options[answer.userAnswer];
            
            // Create status div
            const statusDiv = document.createElement('div');
            statusDiv.className = `review-status ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            statusDiv.textContent = `${statusIcon} ${statusText}`;
            
            // Create question div
            const questionDiv = document.createElement('div');
            questionDiv.className = 'review-question';
            questionDiv.textContent = `${index + 1}. ${answer.question}`;
            
            // Create user answer label
            const userAnswerLabel = document.createElement('div');
            userAnswerLabel.className = 'answer-label';
            userAnswerLabel.textContent = 'Your Answer:';
            
            // Create user answer div
            const userAnswerDiv = document.createElement('div');
            userAnswerDiv.className = `review-answer user-answer ${answer.isCorrect ? 'correct' : 'incorrect'}`;
            userAnswerDiv.textContent = userAnswerText;
            
            reviewItem.appendChild(statusDiv);
            reviewItem.appendChild(questionDiv);
            reviewItem.appendChild(userAnswerLabel);
            reviewItem.appendChild(userAnswerDiv);
            
            // Add correct answer if user was wrong
            if (!answer.isCorrect) {
                const correctAnswerLabel = document.createElement('div');
                correctAnswerLabel.className = 'answer-label';
                correctAnswerLabel.textContent = 'Correct Answer:';
                
                const correctAnswerDiv = document.createElement('div');
                correctAnswerDiv.className = 'review-answer correct-answer';
                correctAnswerDiv.textContent = answer.options[answer.correctAnswer];
                
                reviewItem.appendChild(correctAnswerLabel);
                reviewItem.appendChild(correctAnswerDiv);
            }
            
            reviewContainer.appendChild(reviewItem);
        });
    }

    restartQuiz() {
        this.stopTimer();
        this.clearTimeouts();
        this.questionResolved = false;
        this.showScreen('start-screen');
    }

    showError(message) {
        alert(message);
    }
}

// Initialize the quiz app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});
