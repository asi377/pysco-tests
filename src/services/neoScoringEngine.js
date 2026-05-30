const path = require('path');
const { KEYS } = require('./neoQuestions');
const NORMS = require(path.resolve(__dirname, '../../NEO/NEO_Shiraz_Norms_Database.json'));

const DOMAIN_MAPPING = {
  N: { fa: "روان‌رنجوری", en: "Neuroticism" },
  E: { fa: "برون‌گرایی", en: "Extraversion" },
  O: { fa: "باز بودن به تجربه", en: "Openness" },
  A: { fa: "توافق‌پذیری", en: "Agreeableness" },
  C: { fa: "وجدانی بودن", en: "Conscientiousness" }
};

const DOMAIN_DESCRIPTIONS = {
  N: "میزان ثبات هیجانی و توانایی مقابله با استرس",
  E: "میزان انرژی‌گرایی و تعامل اجتماعی",
  O: "میزان علاقه به تجربه‌های جدید و تفکر خلاقانه",
  A: "میزان همکاری و اعتماد به دیگران",
  C: "میزان سازمان‌دهی و مسئولیت‌پذیری"
};

const FACET_LABELS = {
  N1: "اضطراب", N2: "پرخاشگری", N3: "افسردگی", N4: "کمرویی", N5: "تکانش‌وری", N6: "آسیب‌پذیری",
  E1: "صمیمیت", E2: "معاشرتی بودن", E3: "ابراز وجود", E4: "فعال بودن", E5: "هیجان‌خواهی", E6: "هیجانات مثبت",
  O1: "تخیل", O2: "زیباشناسی", O3: "عواطف", O4: "اعمال", O5: "نظرات", O6: "ارزش‌ها",
  A1: "اعتماد", A2: "رک‌گویی", A3: "نوع‌دوستی", A4: "همراهی", A5: "تواضع", A6: "درک دیگران",
  C1: "شایستگی", C2: "نظم و ترتیب", C3: "وظیفه‌شناسی", C4: "تلاش برای موفقیت", C5: "خویشتن‌داری", C6: "محتاط در تصمیم‌گیری"
};

function getInterpretation(tScore) {
  if (tScore < 35) return "بسیار پایین";
  if (tScore >= 35 && tScore < 45) return "پایین";
  if (tScore >= 45 && tScore <= 55) return "متوسط";
  if (tScore > 55 && tScore <= 65) return "بالا";
  return "بسیار بالا";
}

function checkValidity(userResponses) {
  const values = Object.values(userResponses).map(v => Number(v));
  if (values.length < 240) return { isValid: true, reason: '' };

  const count = (v) => values.filter(x => x === v).length;
  const maxConsecutive = (v) => {
    let max = 0, current = 0;
    for (const x of values) {
      if (x === v) { current++; max = Math.max(max, current); }
      else current = 0;
    }
    return max;
  };

  const threshold = { 0: 6, 1: 9, 2: 10, 3: 14, 4: 9 };
  for (const [val, maxAllowed] of Object.entries(threshold)) {
    if (maxConsecutive(Number(val)) >= maxAllowed) {
      return { isValid: false, reason: `تشابه متوالی زیاد در گزینه ${val}` };
    }
  }
  return { isValid: true, reason: '' };
}

function scoreAssessment(userResponses, gender) {
  if (gender !== "مرد" && gender !== "زن") {
    throw new Error("جنسیت باید 'مرد' یا 'زن' باشد.");
  }

  const validity = checkValidity(userResponses);

  const facetResults = [];
  const domainRawTotals = { N: 0, E: 0, O: 0, A: 0, C: 0 };

  Object.entries(KEYS).forEach(([code, facetData]) => {
    let rawScore = 0;

    facetData.questions.forEach(q => {
      let value = Number(userResponses[q.questionNumber]);
      if (value === undefined || value === null || isNaN(value)) value = 2;
      if (value < 0 || value > 4) {
        throw new Error(`مقدار سوال ${q.questionNumber} باید بین 0 تا 4 باشد`);
      }
      if (q.isReversed) value = 4 - value;
      rawScore += value;
    });

    const norm = NORMS.find(n => n.code === code);
    if (!norm) throw new Error(`هنجار برای ${code} یافت نشد`);

    const mean = gender === "مرد" ? norm.male.mean : norm.female.mean;
    const sd = gender === "مرد" ? norm.male.sd : norm.female.sd;
    const tScore = sd > 0 ? 50 + 10 * ((rawScore - mean) / sd) : 50;

    const dLetter = code.charAt(0);
    if (domainRawTotals[dLetter] !== undefined) domainRawTotals[dLetter] += rawScore;

    facetResults.push({
      code,
      facetName: norm.facet,
      parentDomain: norm.domain,
      rawScore,
      tScore: Number(tScore.toFixed(1)),
      interpretation: getInterpretation(tScore),
    });
  });

  const domainLetters = ['N', 'E', 'O', 'A', 'C'];
  const detailedDomains = domainLetters.map(dKey => {
    const domainFacets = facetResults.filter(f => f.code.startsWith(dKey));
    const avgTScore = domainFacets.length > 0
      ? domainFacets.reduce((acc, f) => acc + f.tScore, 0) / domainFacets.length
      : 50;

    return {
      code: dKey,
      name: DOMAIN_MAPPING[dKey].fa,
      englishName: DOMAIN_MAPPING[dKey].en,
      description: DOMAIN_DESCRIPTIONS[dKey],
      rawScore: domainRawTotals[dKey],
      averageTScore: Number(avgTScore.toFixed(1)),
      interpretation: getInterpretation(avgTScore),
      facets: domainFacets.map(f => ({
        code: f.code,
        name: FACET_LABELS[f.code] || f.facetName,
        rawScore: f.rawScore,
        tScore: f.tScore,
        interpretation: f.interpretation,
      })),
    };
  });

  return {
    gender,
    timestamp: new Date().toISOString(),
    validity,
    domains: detailedDomains,
    facets: facetResults,
  };
}

module.exports = { scoreAssessment, checkValidity, DOMAIN_MAPPING, FACET_LABELS, DOMAIN_DESCRIPTIONS, NORMS };
