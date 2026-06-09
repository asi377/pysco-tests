class GetResultDTO {
  constructor(params) {
    this.sessionId = params.sessionId;
    this.slug = params.slug;
  }

  validate() {
    const errors = [];
    if (!this.sessionId) errors.push('sessionId الزامی است');
    if (!this.slug) errors.push('slug الزامی است');
    return errors;
  }
}

class GetMyResultsDTO {
  constructor(query) {
    this.testSlug = query.testSlug || query.testSlug;
    this.page = Math.max(parseInt(query.page) || 1, 1);
    this.limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  }
}

class CalculateScoreDTO {
  constructor(body) {
    this.sessionId = body.sessionId;
  }

  validate() {
    if (!this.sessionId) return ['sessionId الزامی است'];
    return [];
  }
}

class ShareResultDTO {
  constructor(body) {
    this.sessionId = body.sessionId;
  }

  validate() {
    if (!this.sessionId) return ['sessionId الزامی است'];
    return [];
  }
}

class DeleteResultDTO {
  constructor(params) {
    this.id = params.id;
  }

  validate() {
    if (!this.id) return ['شناسه نتیجه الزامی است'];
    return [];
  }
}

class AdminSharedResultsDTO {
  constructor(query) {
    this.page = Math.max(parseInt(query.page) || 1, 1);
    this.limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100);
  }
}

module.exports = {
  GetResultDTO, GetMyResultsDTO, CalculateScoreDTO,
  ShareResultDTO, DeleteResultDTO, AdminSharedResultsDTO,
};
