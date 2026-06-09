const resultService = require('../../domain/services/result.service');
const {
  GetResultDTO, GetMyResultsDTO, CalculateScoreDTO,
  ShareResultDTO, DeleteResultDTO, AdminSharedResultsDTO,
} = require('./result.dto');
const catchAsync = require('../../infrastructure/utils/catchAsync');

const extractIdentity = (req) => ({
  userId: req.tokenType === 'user' ? req.user?._id : null,
  guestToken: req.tokenType === 'guest' ? req.guest?.guestToken : null,
});

const getResult = catchAsync(async (req, res, next) => {
  const dto = new GetResultDTO(req.params);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const { result, isNew } = await resultService.getOrCreateResult(
    dto.sessionId, dto.slug, extractIdentity(req),
  );

  const { validity, ...safeResult } = result.toObject();
  res.json({
    success: true,
    message: isNew ? 'نتیجه با موفقیت محاسبه شد' : 'نتیجه از قبل محاسبه شده',
    data: safeResult,
  });
});

const getMyResults = catchAsync(async (req, res) => {
  const dto = new GetMyResultsDTO(req.query);

  const data = await resultService.getMyResults(extractIdentity(req), {
    testSlug: dto.testSlug,
    page: dto.page,
    limit: dto.limit,
  });

  const cleanedResults = data.results.map(r => {
    const { validity, ...rest } = r;
    return rest;
  });

  res.json({ success: true, data: { results: cleanedResults, pagination: data.pagination } });
});

const getIncompleteSessions = catchAsync(async (req, res, next) => {
  const data = await resultService.getIncompleteSessions(extractIdentity(req));
  res.json({ success: true, data: data });
});

const calculateScore = catchAsync(async (req, res, next) => {
  const dto = new CalculateScoreDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  const engineResult = await resultService.calculateScore(dto.sessionId);
  res.json({ success: true, data: engineResult });
});

const shareResult = catchAsync(async (req, res, next) => {
  const dto = new ShareResultDTO(req.body);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  await resultService.shareResult(dto.sessionId, extractIdentity(req));
  res.json({ success: true, message: 'نتیجه با موفقیت برای مدیر ارسال شد' });
});

const deleteResult = catchAsync(async (req, res, next) => {
  const dto = new DeleteResultDTO(req.params);
  const errors = dto.validate();
  if (errors.length > 0) {
    const AppError = require('../../domain/errors/AppError');
    return next(new AppError(errors.join(' | '), 400, 'VALIDATION_ERROR'));
  }

  await resultService.deleteResult(dto.id, extractIdentity(req));
  res.json({ success: true, message: 'نتیجه با موفقیت حذف شد' });
});

const getAdminSharedResults = catchAsync(async (req, res) => {
  const dto = new AdminSharedResultsDTO(req.query);

  const data = await resultService.getAdminSharedResults({
    page: dto.page,
    limit: dto.limit,
  });

  res.json({ success: true, data: data });
});

module.exports = {
  getResult, getMyResults, getIncompleteSessions,
  calculateScore, shareResult, deleteResult, getAdminSharedResults,
};
