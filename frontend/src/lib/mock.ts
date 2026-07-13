/**
 * 模拟占卜 API — 前端独立开发用
 *
 * 当后端不可用时（NEXT_PUBLIC_MOCK_API=true），
 * 使用此模块提供模拟数据，使前端可独立开发调试。
 */

/** 爻线数据 */
export interface MockLine {
  /** 位置 1~6，1=初爻 6=上爻 */
  position: number;
  /** 阳爻或阴爻 */
  type: "yang" | "yin";
  /** 是否为变爻 */
  changing: boolean;
}

/** 卦象数据 */
export interface MockHexagram {
  /** 卦名 */
  name: string;
  /** 之卦名（无变爻则为 undefined） */
  changedName?: string;
  /** 六爻数据，下标 0 为初爻 */
  lines: MockLine[];
  /** 稀有度 */
  rarity: "N" | "R" | "SR" | "SSR";
}

/** 占卜 API 的模拟响应 */
export interface MockDivinationResponse {
  id: string;
  hexagram: MockHexagram;
  /** 古诗体判词 */
  judgment: string;
}

/** 解卦 API 的模拟响应 */
export interface MockInterpretationResponse {
  directAnswer: string;
  hexagramAnalysis: string;
  practicalAdvice: string;
}

/* =========================================================================
 * 预置卦象数据（8 个典型卦象，涵盖多种变爻与稀有度场景）
 * ========================================================================= */

/** 乾为天 — 六爻皆阳，无变爻，SR */
const QIAN: MockHexagram = {
  name: "乾为天",
  lines: [
    { position: 1, type: "yang", changing: false },
    { position: 2, type: "yang", changing: false },
    { position: 3, type: "yang", changing: false },
    { position: 4, type: "yang", changing: false },
    { position: 5, type: "yang", changing: false },
    { position: 6, type: "yang", changing: false },
  ],
  rarity: "SR",
};

/** 坤为地 — 六爻皆阴，无变爻，R */
const KUN: MockHexagram = {
  name: "坤为地",
  lines: [
    { position: 1, type: "yin", changing: false },
    { position: 2, type: "yin", changing: false },
    { position: 3, type: "yin", changing: false },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yin", changing: false },
    { position: 6, type: "yin", changing: false },
  ],
  rarity: "R",
};

/** 地天泰 — 初爻变，SSR */
const TAI: MockHexagram = {
  name: "地天泰",
  changedName: "地风升",
  lines: [
    { position: 1, type: "yang", changing: true },
    { position: 2, type: "yang", changing: false },
    { position: 3, type: "yang", changing: false },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yin", changing: false },
    { position: 6, type: "yin", changing: false },
  ],
  rarity: "SSR",
};

/** 水火既济 — 二爻与五爻变，SR */
const JIJI: MockHexagram = {
  name: "水火既济",
  changedName: "风火家人",
  lines: [
    { position: 1, type: "yang", changing: false },
    { position: 2, type: "yin", changing: true },
    { position: 3, type: "yang", changing: false },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yang", changing: true },
    { position: 6, type: "yin", changing: false },
  ],
  rarity: "SR",
};

/** 水雷屯 — 初爻变，R */
const ZHUN: MockHexagram = {
  name: "水雷屯",
  changedName: "水地比",
  lines: [
    { position: 1, type: "yang", changing: true },
    { position: 2, type: "yin", changing: false },
    { position: 3, type: "yin", changing: false },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yang", changing: false },
    { position: 6, type: "yin", changing: false },
  ],
  rarity: "R",
};

/** 风火家人 — 无变爻，N */
const JIAREN: MockHexagram = {
  name: "风火家人",
  lines: [
    { position: 1, type: "yang", changing: false },
    { position: 2, type: "yin", changing: false },
    { position: 3, type: "yang", changing: false },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yang", changing: false },
    { position: 6, type: "yang", changing: false },
  ],
  rarity: "N",
};

/** 雷泽归妹 — 三爻变，R */
const GUIMEI: MockHexagram = {
  name: "雷泽归妹",
  changedName: "雷天大壮",
  lines: [
    { position: 1, type: "yang", changing: false },
    { position: 2, type: "yang", changing: false },
    { position: 3, type: "yin", changing: true },
    { position: 4, type: "yin", changing: false },
    { position: 5, type: "yin", changing: false },
    { position: 6, type: "yang", changing: false },
  ],
  rarity: "R",
};

/** 天地否 — 三爻与六爻变，SSR */
const PI: MockHexagram = {
  name: "天地否",
  changedName: "泽地萃",
  lines: [
    { position: 1, type: "yin", changing: false },
    { position: 2, type: "yin", changing: false },
    { position: 3, type: "yin", changing: true },
    { position: 4, type: "yang", changing: false },
    { position: 5, type: "yang", changing: false },
    { position: 6, type: "yang", changing: true },
  ],
  rarity: "SSR",
};

const HEXAGRAMS = [QIAN, KUN, TAI, JIJI, ZHUN, JIAREN, GUIMEI, PI];

/* =========================================================================
 * 判词模板（古诗体）
 * ========================================================================= */

const JUDGMENTS: Record<string, string> = {
  "乾为天":
    "元亨利贞。天行健，君子以自强不息。\n\n初九曰：潜龙勿用。阳在下也，藏器待时。\n" +
    "九二曰：见龙在田，利见大人。德施普也，龙德而正中者也。\n九三曰：君子终日乾乾，夕惕若厉，无咎。\n" +
    "九四曰：或跃在渊，进无咎也。审时度势，可进可退。\n九五曰：飞龙在天，利见大人。位乎天德，大人造也。\n" +
    "上九曰：亢龙有悔。盈不可久也，知进退存亡而不失其正。",
  "坤为地":
    "元亨，利牝马之贞。地势坤，君子以厚德载物。\n\n初六曰：履霜，坚冰至。阴始凝也，驯致其道。\n" +
    "六二曰：直方大，不习无不利。地道光也。\n六三曰：含章可贞，或从王事，无成有终。\n" +
    "六四曰：括囊，无咎无誉。慎不害也。\n六五曰：黄裳，元吉。文在中也。\n" +
    "上六曰：龙战于野，其血玄黄。其道穷也。",
  "地天泰":
    "小往大来，吉，亨。天地交而万物通也，上下交而其志同也。\n\n" +
    "内阳而外阴，内健而外顺，内君子而外小人——君子道长，小人道消。\n\n" +
    "初九：拔茅茹，以其汇，征吉。\n志在外也。一阳初动，牵连而起。\n" +
    "变爻在初，阳动于下——时机虽未显，根基已动，所问之事将渐入佳境。",
  "水火既济":
    "亨小，利贞。初吉终乱。\n\n水在火上，既济。君子以思患而豫防之。\n\n" +
    "六二：妇丧其茀，勿逐，七日得。\n以中道也。东西虽失，不须追逐，七日自回。\n" +
    "九五：东邻杀牛，不如西邻之禴祭，实受其福。\n吉大来也。诚意为本，不在形式。\n\n" +
    "二与五皆变，内柔而外刚——事虽初成，宜防盛极而衰。",
  "水雷屯":
    "元亨利贞。勿用有攸往，利建侯。\n\n云雷屯，君子以经纶。\n\n" +
    "初九：磐桓，利居贞，利建侯。\n虽磐桓，志行正也。以贵下贱，大得民也。\n" +
    "变爻在初：万物始生，如草木初萌，虽艰而志不可夺。\n" +
    "所问之事，萌芽已动，蓄力以待，不可躁进。",
  "风火家人":
    "利女贞。风自火出，家人。君子以言有物而行有恒。\n\n" +
    "初九：闲有家，悔亡。\n志未变也。治家以严，防患于未然。\n" +
    "六二：无攸遂，在中馈，贞吉。\n顺以巽也。\n" +
    "九三：家人嗃嗃，悔厉吉。妇子嘻嘻，终吝。\n" +
    "六四：富家，大吉。\n顺在位也。\n" +
    "九五：王假有家，勿恤，吉。\n交相爱也。\n" +
    "上九：有孚威如，终吉。\n反身之谓也。",
  "雷泽归妹":
    "征凶，无攸利。归妹，天地之大义也。天地不交而万物不兴。\n\n" +
    "泽上有雷，归妹。君子以永终知敝。\n\n" +
    "六三：归妹以须，反归以娣。\n未当也。此言位不正而事难成。\n" +
    "变爻在三，阴居中而欲变——不宜妄动，当等待合适之机。",
  "天地否":
    "否之匪人，不利君子贞。大往小来。\n\n天地不交而万物不通也，上下不交而天下无邦也。\n\n" +
    "六三：包羞。\n位不当也。小人道长，君子知几。\n" +
    "上九：倾否，先否后喜。\n否终则倾，何可长也。\n\n" +
    "三爻与上爻俱变——否极泰来，乱中见治。\n" +
    "所问之事，暂时阻塞，终将通达。",
};

/* =========================================================================
 * 解卦模板
 * ========================================================================= */

const INTERPRETATIONS: Record<string, MockInterpretationResponse> = {
  "乾为天": {
    directAnswer:
      `此卦乃纯阳之卦，六爻皆阳，如日中天。问事业者，主积极进取，当有大成之象。\n\n` +
      `目前所处阶段正如“潜龙”至“飞龙”之间，需审时度势：若时机未到，不可冒进；若大势已成，当放手一搏。\n\n` +
      `总体而言，这是一个极为吉祥的卦象，但上九“亢龙有悔”提醒您——凡事不可太过，知止方能不败。`,
    hexagramAnalysis:
      `乾卦为《周易》之首卦，象征天、阳刚、创造。六爻皆阳，力量极强。\n\n` +
      `《彖传》曰：“大哉乾元，万物资始，乃统天。”乾之道，在于生生不息、自强不息。\n\n` +
      `今得此卦，无变爻，意味着当前局面比较稳定，外在条件有利。但纯阳无阴，也提示您在行动时需留意柔和之道，刚柔并济方为至善。`,
    practicalAdvice:
      `一、事业方面：积极进取，主动出击。现在正是展现能力的好时机。\n` +
      `二、人际关系：刚健之象，注意不要过于强势，适当放低姿态。\n` +
      `三、时运判断：处于上升期，但需注意“盈不可久”——取得成绩后不要骄傲自满。\n` +
      `四、特别提醒：上九“亢龙有悔”为全卦之警语，提醒您“知进退存亡而不失其正”。`,
  },
  "坤为地": {
    directAnswer:
      `此为纯阴之卦，六爻皆阴，如大地承载万物。问事业者，主以柔克刚、厚德载物。\n\n` +
      `当前不宜做冒进之举，而应积蓄力量，以耐心与包容应对挑战。\n\n` +
      `坤卦的核心智慧在于“牝马之贞”——不是消极等待，而是以柔顺的姿态坚持正道。`,
    hexagramAnalysis:
      `坤卦为《周易》第二卦，象征地、阴柔、承载。\n\n` +
      `《彖传》曰：“至哉坤元，万物资生，乃顺承天。”坤之道在于包容、含藏、配合。\n\n` +
      `今得此卦，无变爻，提示您当前局势需要的是持重和耐心，而非主动出击。`,
    practicalAdvice:
      `一、事业方面：稳守为主，不宜激进扩张。做好手头之事，机会自会来临。\n` +
      `二、人际关系：以包容之心待人，柔中带刚。\n` +
      `三、时运判断：当前是积累期，像大地一样积蓄养分，等待春天。\n` +
      `四、特别提醒：“括囊”之道——有时沉默是金，不要轻易表态。`,
  },
  "地天泰": {
    directAnswer:
      `天地交泰，大吉之象！这是一个极为有利的时机。\n\n` +
      `初爻为变爻，意味着局面刚刚开始变化——基础层面的变动会逐步向上传导。\n\n` +
      `您所问之事，虽然眼下未必见到显著成效，但从根本上已经开始向好的方向转变。`,
    hexagramAnalysis:
      `泰卦上坤下乾——天气下降，地气上升，天地之气相交，故万物通。\n\n` +
      `《彖传》曰：“天地交而万物通也，上下交而其志同也。”\n\n` +
      `变爻在初九，是好的征兆——“拔茅茹，以其汇”，象征一个良好的开端会带动整体向好的方向发展。之卦为升（地风升），更是上升渐进之象。`,
    practicalAdvice:
      `一、事业方面：好时机！抓住当下，从小处着手，逐步扩大。\n` +
      `二、人际关系：天地交泰，沟通顺畅，适合谈判、合作。\n` +
      `三、时运判断：处于上升初期，保持耐心，收获将在后面。\n` +
      `四、特别提醒：泰卦之后是否卦，时时保持谦逊，居安思危。`,
  },
  "水火既济": {
    directAnswer:
      `此卦名“既济”，意为“已经成功”——事情已经达到了一个阶段性的完成。\n\n` +
      `然而《周易》的智慧在于——成功之后往往隐藏着危机。“初吉终乱”是此卦的警训。\n\n` +
      `您所问之事，目前看似顺利，但需要未雨绸缪，提前防范后续可能出现的问题。\n\n` +
      `二爻与五爻变动，之卦为家人——提示您关注内在的调整和家庭/团队的和谐。`,
    hexagramAnalysis:
      `既济卦上坎下离——水在火上，烹饪之象，事已成就。\n\n` +
      `《象传》曰：“水在火上，既济。君子以思患而豫防之。”\n\n` +
      `六二爻变（阴变阳）：“妇丧其茀，勿逐，七日得”——失去的无需焦虑，自然回归。\n` +
      `九五爻变（阳变阴）：“东邻杀牛，不如西邻之禴祭”——诚意为本，不在形式。`,
    practicalAdvice:
      `一、事业方面：项目可能已近尾声，做好收尾工作，并为下一阶段做准备。\n` +
      `二、人际关系：回归家庭和核心团队，加强内部凝聚力。\n` +
      `三、时运判断：当前处于“成功”节点，但不可松懈，防范后续变数。\n` +
      `四、特别提醒：“初吉终乱”——及时复盘，建立长效机制。`,
  },
  "水雷屯": {
    directAnswer:
      `屯者，难也。万物始生，如草木初萌于土中，一切才刚刚开始，前路困难重重。\n\n` +
      `但请不要气馁——《周易》给屯卦的判词是“元亨利贞”，说明只要坚守正道，终究会亨通。\n\n` +
      `初爻为变爻，阳动于最底层——您所问之事正在萌芽阶段，根基在动，需要的是耐心和坚持。`,
    hexagramAnalysis:
      `屯卦上坎下震——云雷交加，万物初生，艰难之时。\n\n` +
      `《彖传》曰：“屯，刚柔始交而难生。”\n\n` +
      `初九变爻：“磐桓，利居贞，利建侯”。虽如磐石般停滞不前，但利于坚守和建立基础。\n之卦为比（水地比），亲近依附之意——意味着通过坚持，终将获得支持。`,
    practicalAdvice:
      `一、事业方面：万事开头难，不要因为起步不顺而放弃。专注打好基础。\n` +
      `二、人际关系：寻找贵人/支持者——比卦提示团结和依附的重要性。\n` +
      `三、时运判断：处于创业初期/项目启动期，困难是正常的。\n` +
      `四、特别提醒：“利建侯”——建立自己的小根据地，先从局部做起。`,
  },
  "风火家人": {
    directAnswer:
      `此卦名“家人”，顾名思义，与家庭、团队、内在关系密切相关。\n\n` +
      `风自火出——风由火的热力产生，意味着外在的影响源于内在的温度。\n\n` +
      `您所问之事，答案不在于外部的激进行动，而在于内部的调整与和谐。`,
    hexagramAnalysis:
      `家人卦上巽下离——风在火上，风化由内而外。\n\n` +
      `《象传》曰：“风自火出，家人。君子以言有物而行有恒。”\n\n` +
      `全卦无变爻，提示当前局面稳定。关键在于“正家”——先处理好内部关系，外在的事情自然顺遂。`,
    practicalAdvice:
      `一、事业方面：注重团队建设，内部和谐是外部成功的基础。\n` +
      `二、人际关系：家庭/核心圈子的支持至关重要，多花时间陪伴重要的人。\n` +
      `三、时运判断：非大起大落之时，而是稳步经营、修身齐家的阶段。\n` +
      `四、特别提醒：“言有物而行有恒”——说话有内容，做事有恒心。`,
  },
  "雷泽归妹": {
    directAnswer:
      `归妹卦谈的是“归”与“嫁”，比喻事物的归属和定位。\n\n` +
      `《归妹》卦辞曰“征凶，无攸利”——主动出击不利，不宜贸然行动。\n\n` +
      `三爻为变爻，“归妹以须，反归以娣”——提示您当前所处的位置不太恰当，需要调整自己的定位。`,
    hexagramAnalysis:
      `归妹卦上震下兑——雷在泽上，少女随长男，有不安于室之象。\n\n` +
      `《彖传》曰：“归妹，天地之大义也。”本卦讨论的是事物各归其位的重要性。\n\n` +
      `六三爻变（阴变阳）：位置不当而强行变化，需慎重。` +
      `之卦为大壮（雷天大壮），说明若能调整好定位，未来可以走向强盛。`,
    practicalAdvice:
      `一、事业方面：当前不宜跳槽或大幅改变方向，先想清楚自己的定位。\n` +
      `二、人际关系：注意自己在团队/关系中的角色是否恰当，不越位也不缺位。\n` +
      `三、时运判断：调整期，需要时间找到合适的位置。\n` +
      `四、特别提醒：“永终知敝”——做事要考虑长远，预知可能的问题。`,
  },
  "天地否": {
    directAnswer:
      `否卦是泰卦的反面——天地不交，万物不通。\n\n` +
      `您所问之事，目前可能遇到了阻塞或困难。但请留意：否卦并非绝境！\n\n` +
      `三爻与上爻同时变动——“包羞”与“倾否，先否后喜”——关键的转机信号已经出现。\n` +
      `否极则倾，黑暗终将过去。之卦为萃（泽地萃），精英汇聚——乱局中自有机遇。`,
    hexagramAnalysis:
      `否卦上乾下坤——天在上而地在下，天地之气不相交，故万物不通。\n\n` +
      `《彖传》曰：“天地不交而万物不通也，上下不交而天下无邦也。”\n\n` +
      `六三爻变（阴变阳）：“包羞”——忍受屈辱，韬光养晦。\n` +
      `上九爻变（阳变阴）：“倾否，先否后喜”——否运倾覆，苦尽甘来。\n\n` +
      `两爻同变是极为强烈的转机信号。`,
    practicalAdvice:
      `一、事业方面：当前是低谷期，不要硬闯，保存实力，等待时机。\n` +
      `二、人际关系：“上下不交”——沟通不畅，减少不必要的争论，以退为进。\n` +
      `三、时运判断：最困难的时候即将过去（上九“倾否”），坚持就有转机。\n` +
      `四、特别提醒：否极泰来，否卦之后就是泰卦——寒冬之后是春天。`,
  },
};

/* =========================================================================
 * 公共 API
 * ========================================================================= */

/**
 * 模拟占卜（起卦 + 判词）。
 *
 * 随机选取一个预置卦象，延迟 1~2 秒后返回，
 * 模拟网络请求耗时。
 */
export async function mockDivination(
  question: string
): Promise<MockDivinationResponse> {
  const delay = 1000 + Math.random() * 1000;
  await new Promise((resolve) => setTimeout(resolve, delay));

  const hexagram = HEXAGRAMS[Math.floor(Math.random() * HEXAGRAMS.length)];

  // 深度克隆 hexagram，避免外部修改影响预置数据
  const cloned: MockHexagram = {
    ...hexagram,
    lines: hexagram.lines.map((l) => ({ ...l })),
  };

  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    hexagram: cloned,
    judgment: JUDGMENTS[hexagram.name] ?? "天机不可尽泄，此卦已示其大意。",
  };
}

/**
 * 模拟解卦（获取白话解读）。
 *
 * 延迟 0.8~1.5 秒后返回三段式解读。
 */
export async function mockInterpretation(
  hexagramName: string
): Promise<MockInterpretationResponse> {
  const delay = 800 + Math.random() * 700;
  await new Promise((resolve) => setTimeout(resolve, delay));

  return (
    INTERPRETATIONS[hexagramName] ?? {
      directAnswer: "此卦象已现，其意自明。请静心体会卦中之理。",
      hexagramAnalysis: "卦爻变化微妙，宜结合自身情况细细品读。",
      practicalAdvice: "保持平常心，顺势而为，不必过于执着。",
    }
  );
}

/**
 * 判断是否应使用 Mock 模式。
 *
 * 环境变量 NEXT_PUBLIC_MOCK_API=true 时启用。
 * 默认值为 false（调真实 API）。
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_API === "true";
}
