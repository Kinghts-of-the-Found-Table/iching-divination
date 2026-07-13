/**
 * 六爻文化简介
 *
 * 三段文字介绍六爻的背景、方法和解读哲学。
 * 文字居中，段间距充足，背景从 ivory 过渡到 diviner。
 */

export default function CultureIntro() {
  return (
    <section className="bg-gradient-to-b from-ivory to-diviner px-4 py-24">
      <div className="mx-auto max-w-[600px] text-center">
        {/* 何为六爻 */}
        <div className="mb-12">
          <h3 className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink">
            何为六爻
          </h3>
          <p className="leading-relaxed text-ink-light">
            六爻源于《周易》，以三枚铜钱抛掷六次成卦。
            每卦六爻，由下而上，象天地人三才之道。
            三千年来，无数人在困惑时向卦象寻求启示。
          </p>
        </div>

        {/* 如何起卦 */}
        <div className="mb-12">
          <h3 className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink">
            如何起卦
          </h3>
          <p className="leading-relaxed text-ink-light">
            心中默念所问之事，摇动龟壳，铜钱落下。
            六爻逐次显现，各有阴阳，各有变数。
            本卦映现状，之卦示趋势，变爻指关键。
          </p>
        </div>

        {/* 如何解读 */}
        <div>
          <h3 className="mb-4 font-[family-name:var(--font-noto-serif)] text-lg text-ink">
            如何解读
          </h3>
          <p className="leading-relaxed text-ink-light">
            卦象不是答案，是一面镜子。
            判词以古诗体写出，供你品味咀嚼。
            解卦以白话解析，助你理清思路。
            最终的选择与行动，始终在你手中。
          </p>
        </div>
      </div>
    </section>
  );
}
