// Additional EN/BE recognition uses the same stable rule IDs and assessments.
const patterns: Record<string, RegExp> = {
  urgency:
    /urgent|immediately|right now|last chance|only today|within \d+ minutes|тэрмінов|неадкладн|зараз жа|толькі сёння|апошні шанц|засталос[яь].{0,20}хвілін/,
  threat:
    /arrest|criminal|your account.{0,25}(?:blocked|suspended)|will (?:block|delete)|штраф|арышт|крымінальн|рахунак.{0,30}заблакав|ваш.{0,20}акаўнт.{0,25}выдал/,
  "secret-request":
    /(?:send|share|tell|read out|forward|give|show).{0,70}(?:code|password|passcode|otp|pin|cvv)|(?:code|password).{0,35}(?:send|share|reply|forward)|(?:дашл|прышл|перашл|скін|назав|паведам|пакаж|прадык[а-яіў]*).{0,70}(?:код|парол|пін|лічб)/,
  "unexpected-payment":
    /(?:send|transfer|pay|deposit).{0,55}(?:money|fee|funds|deposit|insurance|delivery|card|account|byn|usd)|(?:перавядз|пераліч|аплац|заплац|скін).{0,50}(?:грош|сродк|рахун|карт|збор|камісі|дастаўк)/,
  "device-control":
    /(?:install|download|enable).{0,45}(?:app|software|apk|remote access)|(?:усталю|спампуй|уключ).{0,45}(?:праграм|дадат|аддален|apk)/,
  "channel-switch":
    /(?:switch|move|continue|contact).{0,45}(?:telegram|whatsapp|viber|another chat)|(?:перайдз|працягн|напіш).{0,50}(?:тэлеграм|вайбер|іншы чат|месенджар)/,
  "claimed-authority":
    /bank security|police officer|tax office|your (?:manager|director)|служба бяспекі|супрацоўнік.{0,25}(?:банка|міліцыі)|падатковая інспекц|ваш дырэктар|служба падтрымкі/,
  secrecy:
    /do not (?:tell|call the bank)|don't (?:tell|call the bank)|keep (?:it|this).{0,20}secret|confidential operation|нікому не (?:каж|расказ)|не тэлефануй.{0,20}банк|захоўвай.{0,20}таямніц|сакрэтная аперац/,
  "third-party-payee":
    /(?:safe|reserve|protective|insurance) account|(?:card|account).{0,25}(?:colleague|brother|someone else)|(?:бяспечн|рэзервов|страхав)[а-яіў]* рахунак|картк[а-яіў]*.{0,25}(?:калег|брата|іншага)/,
  "unverified-link":
    /(?:open|follow|click|sign in).{0,35}(?:link|website|form)|(?:перайдз|адкрый|націсн).{0,35}(?:спасыл|сайт|форм)/,
  "easy-benefit":
    /you (?:won|have won)|guaranteed (?:income|profit)|risk.free|free premium|вы выйгралі|гарантаван.{0,20}(?:прыбыт|даход)|бясплатн.{0,20}(?:падпіс|падарун)|без рызыкі/,
  "identity-documents":
    /(?:send|upload|confirm|provide).{0,40}(?:passport|identity|personal details|selfie)|(?:дашл|прышл|пацвердз|назав|удакладн).{0,50}(?:пашпарт|асабіст|дакумент|дату нарадж)/,
  "friendly-loan":
    /lend me|borrow.{0,25}(?:money|byn|until)|help me out|pay you back|пазыч|выруч[а-яіў]*|пазыкі|вярну.{0,20}(?:заўтра|зарплат)/,
  "card-details":
    /(?:send|provide|enter|confirm|show).{0,50}(?:cvv|cvc|card details|card number|both sides)|(?:дашл|прышл|пацвердз|назав|увядз|пакаж).{0,50}(?:cvv|cvc|даныя карт|рэквізіт|абодвух бакоў)/,
  "call-digits":
    /(?:send|tell|read|share).{0,40}(?:last.{0,15}digits|screenshot.{0,30}(?:notification|message))|(?:назав|дашл|прышл|скін).{0,50}(?:апошні.{0,20}лічб|скрын.{0,30}(?:паведам|апавяшч))/,
  "qr-action":
    /(?:scan|use).{0,35}qr|(?:адскан|скануй|навядз).{0,35}(?:qr|куар)/,
  "loan-instruction":
    /(?:take out|apply for|obtain).{0,35}(?:loan|credit)|(?:аформ|атрым|вазьм).{0,35}крэдыт|сустрэчн.{0,15}крэдыт/,
  "cash-courier":
    /(?:hand|give|send|withdraw).{0,40}(?:cash|courier)|(?:мама|тата).{0,30}бядзе|(?:перадай|здымі|аддай).{0,45}(?:наяўн|кур.?ер)|кур.?ер.{0,25}забярэ/,
  declaration:
    /declare.{0,25}(?:savings|funds|money)|special operation|covert operation|(?:задэклар|дэкларав).{0,35}(?:грош|сродк|збераж)|спецаперац|закрыт.{0,15}правер/,
  "refund-fee":
    /(?:refund|withdraw|receive|release).{0,70}(?:fee|tax|insurance|payment)|(?:вяртан|вярну|вывад|атрыма).{0,60}(?:камісі|збор|ўзнос|страхав|падат)/,
  "buyer-receive":
    /(?:i paid|payment is ready|receive your money).{0,70}(?:link|form|card|website)|(?:я аплаціў|атрымайце аплату|грошы адпраўлены).{0,60}(?:спасыл|форм|карт|сайт)/,
  "paid-survey":
    /(?:survey|questionnaire).{0,45}(?:reward|money|bonus)|(?:апытан|анкета).{0,45}(?:ўзнагарод|грош|бонус)/,
  "voting-login":
    /vote for|need your vote|claim.{0,30}(?:premium|subscription)|прагаласуй|аддай.{0,15}голас|забяры.{0,30}(?:premium|падпіс)/,
  "contract-renewal":
    /(?:renew|extend|expires).{0,40}(?:contract|sim|number)|parcel.{0,40}(?:held|address|delivery)|(?:падоўж|падаўж|заканчва).{0,40}(?:дагавор|сувяз|нумар)|пасылк.{0,40}(?:адрас|затрыман)|замен.{0,30}(?:дамафон|лічыльнік)/,
  "fake-manager":
    /(?:director|manager|accountant).{0,60}(?:payment|transfer|balance|statement)|contract.{0,25}later|(?:дырэктар|кіраўнік|бухгалтар).{0,60}(?:перавод|аплат|рахунк)|дагавор.{0,20}пазней/,
  "money-mule":
    /rent.{0,20}(?:card|account)|receive transfers.{0,60}(?:commission|percent)|картк.{0,25}(?:арэнду|арэнд)|прымай.{0,30}перавод.{0,50}(?:працэнт|ўзнагарод)/,
  "investment-trap":
    /(?:robot|ai).{0,40}(?:trade|profit|crypto)|invest.{0,45}(?:earn|return|crypto)|(?:profit|income).{0,20}\d+%|(?:робат|штучны інтэлект).{0,40}(?:гандл|прыбыт|крыпт)|укладз.{0,40}(?:атрыма|даход)|даход.{0,20}\d+%/,
  prepayment:
    /prepay|advance payment|deposit.{0,20}(?:booking|reservation)|перадаплат|аванс|задатак|аплаці.{0,35}навучан/,
  "romance-bait":
    /(?:gift|date|romance).{0,55}(?:pay|customs|ticket|fee)|(?:падарун|спаткан).{0,55}(?:аплац|дастаўк|мытн|білет|збор)/,
  "account-takeover":
    /(?:log|sign).{0,10}in.{0,20}(?:my|our|test).{0,20}(?:icloud|account)|confirm.{0,25}new (?:session|device)|(?:увайдз|зайдз).{0,30}(?:мой|наш|чужы).{0,20}(?:icloud|акаўнт)|пацвердз.{0,30}нов[а-яіў]* (?:сеанс|прылад)/,
  "screen-sharing":
    /(?:enable|share|show).{0,40}(?:screen|notifications|accessibility)|(?:уключ|пакаж|дазволь).{0,45}(?:экран|апавяшч|спецыяльн[а-яіў]* магчымасц)/,
  "nfc-card":
    /(?:tap|hold|put).{0,35}card.{0,25}(?:phone|device)|(?:прыкладз|падняс).{0,35}картк.{0,30}(?:тэлефон|смартфон)|nfc.{0,30}(?:card|карт)/,
  "security-disable":
    /(?:disable|turn off).{0,35}(?:antivirus|protection|notifications)|(?:адключ|выключ).{0,35}(?:антывірус|абарон|апавяшч)/,
  "dangerous-file":
    /(?:open|run|unpack|download).{0,35}(?:attachment|archive|update)|(?:адкрый|распакуй|запусці|спампуй).{0,45}(?:укладан|архіў|абнаўлен)/,
  "account-alarm":
    /(?:unauthori[sz]ed|new device).{0,35}(?:login|access)|(?:confirm|verify).{0,35}(?:account|details|code)|пацвердз.{0,35}(?:код|акаўнт|даныя)|несанкцыянаван.{0,30}(?:уваход|доступ)|уваход з новай прылады/,
  "compensation-bait":
    /(?:approved|eligible|claim).{0,45}(?:compensation|benefit|payment)|вам (?:ухвален|налічан|належыць).{0,40}(?:выплат|кампенсац|дапамог)/,
  "recovery-promise":
    /(?:recover|return|refund).{0,35}(?:stolen|lost).{0,60}(?:fee|advance|pay)|(?:вернем|вярнем).{0,30}(?:скрадзен|страчан).{0,60}(?:аплац|збор|ўзнос)/,
};
const contextual = new Set([
  "urgency",
  "threat",
  "claimed-authority",
  "secrecy",
  "third-party-payee",
  "easy-benefit",
  "friendly-loan",
  "declaration",
  "refund-fee",
  "paid-survey",
  "fake-manager",
  "money-mule",
  "investment-trap",
  "prepayment",
  "romance-bait",
  "compensation-bait",
  "recovery-promise",
]);
export function recognizesAdditionalLanguage(
  id: string,
  input: string,
): boolean {
  const pattern = patterns[id];
  if (!pattern) return false;
  const text = input.normalize("NFKC").toLowerCase().replace(/ё/g, "е");
  if (contextual.has(id)) return pattern.test(text);
  const scan = new RegExp(pattern.source, "g");
  for (const m of text.matchAll(scan)) {
    const prefix = text.slice(Math.max(0, m.index! - 75), m.index);
    const tail = text.slice(m.index!, m.index! + m[0].length + 70);
    if (
      /except (?:our|the) (?:agent|employee|support)|акрамя нашага/.test(tail)
    )
      return true;
    if (
      /(?:\bdo not|\bdon't|\bnever|\bmust not|\bshould not|не|нельга)\s*$/.test(
        prefix,
      )
    )
      continue;
    if (/never ask.{0,30}$|do not ask.{0,30}$|не просім.{0,25}$/.test(prefix))
      continue;
    return true;
  }
  return false;
}
