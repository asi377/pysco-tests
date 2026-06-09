class GetTestsDTO {
  constructor(query) {
    this.page = Math.max(parseInt(query.page) || 1, 1);
    this.limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  }
}

class GetQuestionsDTO {
  constructor(query) {
    this.lang = query.lang || 'fa';
    this.page = Math.max(parseInt(query.page) || 1, 1);
    this.limit = Math.min(Math.max(parseInt(query.limit) || 50, 1), 240);
  }
}

class CreateSessionDTO {
  constructor(body) {
    this.forceNew = body.forceNew === true;
  }
}

class SubmitAnswerDTO {
  constructor(body) {
    this.sessionId = body.sessionId;
    this.answer = body.answer;
  }

  validate() {
    const errors = [];
    if (!this.sessionId) errors.push('شناسه جلسه الزامی است');
    if (!this.answer || typeof this.answer !== 'object') {
      errors.push('پاسخ باید یک شیء باشد');
    } else {
      if (typeof this.answer.questionNumber !== 'number' || this.answer.questionNumber < 1 || this.answer.questionNumber > 240) {
        errors.push('شماره سوال باید بین ۱ تا ۲۴۰ باشد');
      }
      if (typeof this.answer.value !== 'number' || this.answer.value < 0 || this.answer.value > 4) {
        errors.push('مقدار پاسخ باید بین ۰ تا ۴ باشد');
      }
    }
    return errors;
  }
}

class SubmitAnswersDTO {
  constructor(body) {
    this.sessionId = body.sessionId;
    this.answers = body.answers;
  }

  validate() {
    const errors = [];
    if (!this.sessionId) errors.push('شناسه جلسه الزامی است');
    if (!Array.isArray(this.answers) || this.answers.length === 0) {
      errors.push('پاسخ‌ها باید یک آرایه باشند');
    }
    if (Array.isArray(this.answers)) {
      for (const ans of this.answers) {
        if (!ans.questionId) errors.push('شناسه سوال الزامی است');
        if (typeof ans.answer !== 'number' || ans.answer < 0 || ans.answer > 4) {
          errors.push('پاسخ باید عددی بین ۰ تا ۴ باشد');
        }
      }
    }
    return errors;
  }
}

class GetSessionDTO {
  constructor(params) {
    this.sessionId = params.sessionId;
    this.slug = params.slug;
  }

  validate() {
    const errors = [];
    if (!this.sessionId) errors.push('شناسه جلسه الزامی است');
    if (!this.slug) errors.push('slug الزامی است');
    return errors;
  }
}

class GetCurrentQuestionDTO {
  constructor(query) {
    this.sessionId = query.sessionId;
  }

  validate() {
    if (!this.sessionId) return ['sessionId الزامی است'];
    return [];
  }
}

module.exports = {
  GetTestsDTO, GetQuestionsDTO, CreateSessionDTO,
  SubmitAnswerDTO, SubmitAnswersDTO, GetSessionDTO,
  GetCurrentQuestionDTO,
};
