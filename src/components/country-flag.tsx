const ISO_A3_TO_A2: Record<string, string> = {
  AFG:"af", ALB:"al", ALG:"dz", AND:"ad", ANG:"ao", ANT:"ag", ARG:"ar", ARM:"am", AUS:"au", AUT:"at",
  AZE:"az", BAH:"bs", BHR:"bh", BAN:"bd", BAR:"bb", BLR:"by", BEL:"be", BLZ:"bz", BEN:"bj", BER:"bm",
  BHU:"bt", BOL:"bo", BIH:"ba", BOT:"bw", BRA:"br", BRU:"bn", BUL:"bg", BUR:"mm",
  CAN:"ca", CPV:"cv", CAY:"ky", CAF:"cf", CHI:"cl", CHN:"cn", COL:"co", COM:"km", CGO:"cg", COD:"cd",
  COK:"ck", CRC:"cr", CIV:"ci", CRO:"hr", CUB:"cu", CYP:"cy", CZE:"cz", DEN:"dk", DJI:"dj", DMA:"dm",
  DOM:"do", ECU:"ec", EGY:"eg", ESA:"sv", GNQ:"gq", ERI:"er", EST:"ee", SWZ:"sz", ETH:"et", FAR:"fo",
  FIJ:"fj", FIN:"fi", FRA:"fr", GAB:"ga", GAM:"gm", GEO:"ge", GER:"de", GHA:"gh", GRC:"gr",
  GRN:"gd", GUA:"gu", GUI:"gn", GUY:"gy", HAI:"ht", HON:"hn", HKG:"hk", HUN:"hu", ISL:"is", IND:"in",
  INA:"id", IRI:"ir", IRL:"ie", IRQ:"iq", ISR:"il", ITA:"it", JAM:"jm", JPN:"jp", JOR:"jo", KAZ:"kz",
  KEN:"ke", KIR:"ki", KOR:"kr", KUW:"kw", KGZ:"kg", LAO:"la", LAT:"lv", LBA:"lb", LES:"ls", LBR:"lr",
  LBY:"ly", LIE:"li", LTU:"lt", LUX:"lu", MAD:"mg", MWI:"mw", MAS:"my", MLI:"ml", MLT:"mt",
  MHL:"mh", MRT:"mr", MRI:"mu", MEX:"mx", FSM:"fm", MDA:"md", MON:"mc", MNE:"me", MAR:"ma", MOZ:"mz",
  MYA:"mm", NAM:"na", NRU:"nr", NPL:"np", NED:"nl", NZL:"nz", NCA:"ni", NIG:"ne", NGR:"ng", MKD:"mk",
  NOR:"no", OMA:"om", PAK:"pk", PLW:"pw", PAN:"pa", PNG:"pg", PAR:"py", PER:"pe", PHI:"ph", POL:"pl",
  POR:"pt", PUR:"pu", QAT:"qa", ROU:"ro", RUS:"ru", RWA:"rw", LCA:"lc", VIN:"vc", SAM:"ws", SMR:"sm",
  STP:"st", KSA:"sa", SEN:"sn", SRB:"rs", SEY:"sc", SLE:"sl", SGP:"sg", SVK:"sk", SVN:"si", SOL:"sb",
  SOM:"so", RSA:"za", ESP:"es", SRI:"lk", SUD:"sd", SUR:"sy", SWE:"se", SUI:"ch", SYR:"sy", TPE:"tw",
  TJK:"tj", TAN:"tz", THA:"th", TLS:"tl", TOG:"tg", TGA:"to", TRI:"tt", TUN:"tn", TUR:"tr", TKM:"tm",
  TUV:"tv", UGA:"ug", UKR:"ua", UAE:"ae", GBR:"gb", USA:"us", URU:"uy", UZB:"uz", VAN:"vu", VEN:"ve",
  VIE:"vn", YEM:"ye", ZAM:"zm", ZIM:"zw",
};

export function CountryFlag({ code, className = "" }: { code: string; className?: string }) {
  if (!code) return <span className="text-muted-foreground/40">—</span>;
  const c = code.toUpperCase();
  const a2 = c.length === 2 ? c.toLowerCase() : ISO_A3_TO_A2[c];
  if (!a2) return <span className="text-muted-foreground/40">—</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${a2}.png`}
      alt={c}
      className={`w-5 h-[14px] rounded-[2px] object-cover shrink-0 ${className}`}
      loading="lazy"
    />
  );
}

export function HandEmoji({ hand }: { hand?: string }) {
  return <span>{hand === "L" ? "🤚" : "✋"}</span>;
}
