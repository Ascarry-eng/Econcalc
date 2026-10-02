// konular.js — Mathematics I haftalık konular: özet, formül, iktisatta kullanım, çözümlü örnek, sık hatalar,
// İngilizce–Türkçe terimler. İçerik String.raw ile yazılır (LaTeX ters bölüleri korunsun).
// DİKKAT: içerikte "$" hemen ardından "{" yazma — şablon dizgesinde yer tutucu sayılır.
(function () {
  "use strict";
  const R = String.raw;

  const KONULAR = [
    {
      id: 1, hafta: 1, ad: "Matematiğe giriş", ozet: "Fonksiyon, tanım kümesi, üs kuralları, eğim", araclar: ["grafik", "denklem"],
      terimler: [["function", "fonksiyon"], ["variable", "değişken"], ["domain", "tanım kümesi"], ["range", "değer kümesi"], ["slope", "eğim"], ["exponent", "üs"], ["intercept", "eksen kesişimi"]],
      md: R`Bu ders iktisadın dilini kuruyor: değişkenler arasındaki ilişkiyi fonksiyonla yazmak, grafikle okumak ve değişimi ölçmek.

## Fonksiyon
Bir fonksiyon her girdiye TEK bir çıktı atar. $y = f(x)$ yazımında $x$ bağımsız değişken (girdi), $y$ bağımlı değişkendir. İktisatta harflerin anlamı vardır:

| harf | İngilizce | Türkçe |
|---|---|---|
| Q | quantity | miktar |
| P | price | fiyat |
| TR, TC | total revenue, total cost | toplam gelir, toplam maliyet |
| π | profit | kâr |
| Y, C, I | income, consumption, investment | gelir, tüketim, yatırım |
| K, L | capital, labor | sermaye, emek |

**Tanım kümesi (domain):** fonksiyona girebilecek değerler. İktisatta miktar ve fiyat negatif olamaz: $Q \ge 0$. Ayrıca $\sqrt{x}$ için $x \ge 0$, $\ln x$ için $x > 0$, $1/x$ için $x \ne 0$.

## Üs ve kök kuralları
> $$a^m a^n = a^{m+n},\qquad \frac{a^m}{a^n} = a^{m-n},\qquad (a^m)^n = a^{mn}$$

> $$a^{-n} = \frac{1}{a^n},\qquad a^{1/n} = \sqrt[n]{a},\qquad a^0 = 1$$

Türev ve integralde kökleri ve kesirleri ÜS biçimine çevirmek işi çok kolaylaştırır: $\dfrac{5}{\sqrt{x}} = 5x^{-1/2}$.

## Eğim
İki nokta arasındaki ortalama değişim hızı: $\dfrac{\Delta y}{\Delta x} = \dfrac{y_2 - y_1}{x_2 - x_1}$. Dersin geri kalanının çekirdeği budur: türev, bu oranın $\Delta x \to 0$ iken limitidir.

**Dikkat:** talep–arz grafiğinde fiyat DİKEY, miktar YATAY eksendedir (Marshall geleneği). Fonksiyon ise çoğu zaman $Q = f(P)$ diye yazılır. Grafiği doğrudan çizen, ters talep fonksiyonu $P = f(Q)$'dur.

## Çözümlü örnek
**Soru:** $f(x) = 3x^2 - 2x + 1$ ise $f(2)$ ve $f(a+1)$ nedir?

$f(2) = 3\cdot 4 - 4 + 1 = 9$.

$f(a+1) = 3(a+1)^2 - 2(a+1) + 1 = 3a^2 + 6a + 3 - 2a - 2 + 1 = 3a^2 + 4a + 2$.

## Sık yapılan hatalar
- $(a+b)^2 \ne a^2 + b^2$; doğrusu $a^2 + 2ab + b^2$.
- $\sqrt{a + b} \ne \sqrt a + \sqrt b$.
- $-x^2$ ile $(-x)^2$ farklıdır: $x = 3$ için $-9$ ve $9$.`,
    },
    {
      id: 2, hafta: 2, ad: "Doğrusal denklemler ve iktisatta uygulamaları", ozet: "Eğim, arz–talep dengesi, başabaş, vergi, denklem sistemi", araclar: ["dogru", "sistem", "denge", "basabas"],
      terimler: [["linear equation", "doğrusal denklem"], ["demand / supply", "talep / arz"], ["equilibrium", "denge"], ["break-even point", "başabaş noktası"], ["fixed / variable cost", "sabit / değişken maliyet"], ["simultaneous equations", "eşanlı denklemler"], ["substitution / elimination", "yerine koyma / yok etme"], ["tax incidence", "vergi yükünün dağılımı"]],
      md: R`Doğrusal fonksiyon $y = mx + b$: $m$ eğim (x bir birim artınca y'nin değişimi), $b$ dikey eksen kesişimi. Eğim sabit olduğundan her birimlik değişim aynı etkiyi yapar.

## Formüller
> $$m = \frac{y_2 - y_1}{x_2 - x_1},\qquad y - y_1 = m(x - x_1)$$

Genel biçimden: $ax + by = c \;\Rightarrow\; y = -\dfrac{a}{b}x + \dfrac{c}{b}$.

## İktisatta
**Talep ve arz:** $Q_d = a - bP$ ($b > 0$: fiyat artınca talep azalır), $Q_s = c + dP$ ($d > 0$).

> $$\text{Denge: } Q_d = Q_s \;\Rightarrow\; P^* = \frac{a - c}{b + d}$$

**Maliyet ve gelir:** $TC = FC + vQ$ (sabit + değişken), $TR = pQ$.

> $$\text{Başabaş: } TR = TC \;\Rightarrow\; Q_{BE} = \frac{FC}{p - v}$$

$p - v$ katkı payıdır: her birimin sabit maliyeti karşılamaya katkısı.

**Birim vergi $t$:** satıcıdan alınan vergi arz eğrisini $t$ kadar yukarı kaydırır. Tüketicinin ödediği $P_c$ ile üreticinin eline geçen $P_p$ arasında $P_c - P_p = t$ farkı açılır. Yükün büyüğü esnekliği düşük tarafa biner.

**İki bilinmeyenli sistem:** yerine koyma ya da yok etme yöntemi. Doğrular paralelse (eğimler eşit, kesişimler farklı) çözüm yok; çakışıksa sonsuz çözüm var.

## Çözümlü örnek
Talep $Q_d = 100 - 2P$, arz $Q_s = 20 + 2P$.
1. Eşitle: $100 - 2P = 20 + 2P \Rightarrow 80 = 4P \Rightarrow P^* = 20$.
2. Yerine koy: $Q^* = 100 - 40 = 60$.

Satıcıya birim başına $t = 4$ vergi gelsin: arz $Q_s = 20 + 2(P - 4)$ olur.
$100 - 2P = 12 + 2P \Rightarrow P_c = 22$, $P_p = 18$, $Q_t = 56$.
Eğimler eşit olduğu için yük yarı yarıya: tüketiciye 2, üreticiye 2. Vergi geliri $4 \times 56 = 224$.

## Sık yapılan hatalar
- Eğimde pay ve paydanın nokta sırasını karıştırmak.
- $Q = a - bP$ talebinin grafikteki eğimini $-b$ sanmak: P dikey eksende olduğu için eğim $-1/b$'dir.
- Vergiyi yanlış tarafa eklemek: satıcıdan alınırsa $Q_s(P - t)$, alıcıdan alınırsa $Q_d(P + t)$.`,
    },
    {
      id: 3, hafta: 3, ad: "İkinci derece denklemler", ozet: "Diskriminant, kökler, tepe noktası, gelir ve kâr parabolü", araclar: ["ikinci", "basabas", "kar"],
      terimler: [["quadratic equation", "ikinci derece denklem"], ["discriminant", "diskriminant"], ["root", "kök"], ["vertex", "tepe noktası"], ["parabola", "parabol"], ["factorize", "çarpanlara ayırmak"], ["total revenue", "toplam gelir"]],
      md: R`$f(x) = ax^2 + bx + c$ ($a \ne 0$) grafiği bir paraboldür. $a > 0$ ise kollar yukarı (∪, tepe en düşük nokta), $a < 0$ ise aşağı (∩, tepe en yüksek nokta).

## Formüller
> $$\Delta = b^2 - 4ac,\qquad x_{1,2} = \frac{-b \pm \sqrt{\Delta}}{2a}$$

> $$\text{Tepe: } x_T = -\frac{b}{2a},\qquad y_T = f(x_T)$$

- $\Delta > 0$: iki reel kök. $\Delta = 0$: çift kök (parabol eksene teğet). $\Delta < 0$: reel kök yok.
- Kökler biliniyorsa $ax^2 + bx + c = a(x - x_1)(x - x_2)$; ayrıca $x_1 + x_2 = -b/a$ ve $x_1 x_2 = c/a$.

## İktisatta
**Toplam gelir:** ters talep $P = a - bQ$ ise $TR = PQ = aQ - bQ^2$, kolları aşağı bir parabol. Gelir tepe noktasında, $Q = \dfrac{a}{2b}$'de en büyüktür — talep doğrusunun orta noktası, esnekliğin $-1$ olduğu yer.

**Kâr:** $\pi = TR - TC$ çoğu zaman ikinci derecedir. Başabaş noktaları $\pi = 0$'ın kökleri, en büyük kâr tepe noktasıdır.

**Doğrusal olmayan denge:** $P = 120 - Q^2$ ve $P = 20 + 3Q$ ise $Q^2 + 3Q - 100 = 0$. Yalnız POZİTİF kök iktisadi olarak anlamlıdır.

## Çözümlü örnek
$P = 100 - 2Q$, $TC = 10Q + 400$.

$TR = 100Q - 2Q^2$, dolayısıyla $\pi = -2Q^2 + 90Q - 400$.

**Başabaş:** $2Q^2 - 90Q + 400 = 0 \Rightarrow Q^2 - 45Q + 200 = 0$, $\Delta = 2025 - 800 = 1225$, $\sqrt{\Delta} = 35$, yani $Q = 5$ ya da $Q = 40$.

**En büyük kâr:** $Q = -\dfrac{90}{2(-2)} = 22.5$, $\pi = 2025 - 1012.5 - 400 = 612.5$, fiyat $P = 55$.

## Sık yapılan hatalar
- Formülde $-b$'yi unutmak ya da $2a$'yı yalnız kökün altına bölmek.
- Negatif kökü iktisadi cevap diye yazmak (negatif miktar olmaz).
- Tepe noktasının yüksekliğini $f(x_T)$ yerine $x_T$ sanmak.`,
    },
    {
      id: 4, hafta: 4, ad: "Üstel fonksiyon ve logaritma", ozet: "e sayısı, ln kuralları, üstel denklem çözümü, büyüme", araclar: ["log", "buyume"],
      terimler: [["exponential function", "üstel fonksiyon"], ["logarithm", "logaritma"], ["natural logarithm", "doğal logaritma"], ["base", "taban"], ["growth / decay", "büyüme / azalma"], ["doubling time", "katlanma süresi"]],
      md: R`Üstel fonksiyon $f(x) = a^x$ ($a > 0$, $a \ne 1$): değişken ÜSTTEDİR. Sabit ORANLA büyüyen her şey üsteldir: bileşik faiz, nüfus, enflasyonla fiyatlar. Logaritma üstelin tersidir: "$b$'yi kaçıncı kuvvete yükseltirsem $x$ olur?"

> $$\log_b x = y \iff b^y = x$$

$e \approx 2.71828$ doğal tabandır, $\ln x = \log_e x$. Hesap makinesinde **ln doğal**, **log 10 tabanlıdır**.

## Kurallar
> $$\ln(xy) = \ln x + \ln y,\qquad \ln\frac{x}{y} = \ln x - \ln y,\qquad \ln x^n = n\ln x$$

> $$\ln e = 1,\quad \ln 1 = 0,\quad e^{\ln x} = x,\quad \log_b x = \frac{\ln x}{\ln b}$$

$\ln$ yalnız POZİTİF sayılar için tanımlıdır ve $\ln(x + y) \ne \ln x + \ln y$.

## Üstel denklem çözmek
Bilinmeyen üstteyse iki tarafın logaritmasını al:

> $$a\,b^x = c \;\Rightarrow\; x = \frac{\ln(c/a)}{\ln b}$$

## İktisatta
- **Bileşik büyüme:** $y_t = y_0(1+g)^t$; sürekli büyüme: $y_t = y_0 e^{kt}$.
- **Logaritmik fark ≈ yüzde değişim:** küçük değişimlerde $\ln y_2 - \ln y_1 \approx \dfrac{y_2 - y_1}{y_1}$. İktisatçıların log ölçeği sevmesinin nedeni bu.
- **Katlanma süresi:** $t = \dfrac{\ln 2}{\ln(1+g)} \approx \dfrac{70}{\%g}$ (70 kuralı).

## Çözümlü örnek
**Soru:** %8 yıllık bileşik faizle 1000 TL kaç yılda 2000 TL olur?

$1000(1.08)^t = 2000 \Rightarrow (1.08)^t = 2 \Rightarrow t = \dfrac{\ln 2}{\ln 1.08} = \dfrac{0.6931}{0.07696} \approx 9.01$ yıl. (70 kuralı: $70/8 = 8.75$.)

## Sık yapılan hatalar
- $\ln(x+y)$'yi parçalamak.
- log tuşuyla ln tuşunu karıştırmak: sonuçlar yaklaşık 2.3 kat farklı çıkar.
- $e^{x+y}$ yerine $e^x + e^y$ yazmak; doğrusu $e^x e^y$.`,
    },
    {
      id: 5, hafta: 5, ad: "Faiz: basit, bileşik, sürekli", ozet: "Gelecek ve bugünkü değer, efektif faiz, reel faiz", araclar: ["faiz", "tvm"],
      terimler: [["simple / compound interest", "basit / bileşik faiz"], ["principal", "anapara"], ["future value", "gelecek değer"], ["present value", "bugünkü değer"], ["discounting", "iskonto"], ["effective annual rate", "efektif yıllık faiz"], ["continuous compounding", "sürekli bileşik faiz"], ["nominal / real interest rate", "nominal / reel faiz"]],
      md: R`Paranın zaman değeri: bugünkü 1 TL, gelecekteki 1 TL'den değerlidir çünkü faize yatırılabilir. Faiz yalnız anaparaya işliyorsa BASİT, faiz de faiz kazanıyorsa BİLEŞİK faizdir.

## Formüller
> $$\text{Basit: } FV = P(1 + rt)$$

> $$\text{Bileşik (yılda } m \text{ kez): } FV = P\left(1 + \frac{r}{m}\right)^{mt}$$

> $$\text{Sürekli: } FV = Pe^{rt}$$

> $$\text{Bugünkü değer: } PV = \frac{FV}{(1+i)^n},\qquad PV = FV\,e^{-rt}$$

> $$\text{Efektif yıllık faiz: } r_{ef} = \left(1 + \frac{r}{m}\right)^m - 1,\qquad r_{ef} = e^r - 1$$

$r$ yıllık NOMİNAL faiz, $m$ yıldaki bileşik sayısı, $t$ yıl, $i = r/m$ dönem faizi, $n = mt$ dönem sayısı.

## İktisatta
- **İskonto:** gelecekteki bir ödemenin bugünkü değeri. Tahvil fiyatı ve yatırım kararları hep bunun üstüne kurulur.
- **Nominal ve reel faiz (Fisher):** enflasyon $\pi$ iken $1 + r_{reel} = \dfrac{1 + r_{nom}}{1 + \pi}$; küçük değerlerde $r_{reel} \approx r_{nom} - \pi$. Yüksek enflasyonda yaklaşık formül ciddi sapar — kesin formülü kullan.
- **Aylık faiz ilanı:** aylık %3, yıllık efektif $(1.03)^{12} - 1 \approx \%42.6$ eder; yıllık %36 değil.

## Çözümlü örnek
10 000 TL, yıllık nominal %12, 3 yıl:
- Basit: $10000(1 + 0.36) = 13\,600$
- Yıllık bileşik: $10000(1.12)^3 = 14\,049.28$
- Aylık bileşik: $10000(1.01)^{36} = 14\,307.69$
- Sürekli: $10000\,e^{0.36} = 14\,333.29$

Bileşik sayısı arttıkça sonuç büyür ama sürekli bileşik sınırını aşamaz.

## Sık yapılan hatalar
- Aylık bileşikte yıllık faizi 12'ye bölmeyi ya da süreyi 12 ile çarpmayı unutmak.
- Yüzdeyi ondalığa çevirmemek (%12 → 0.12).
- Bugünkü değerde üssün işaretini karıştırmak: pozitif faizde PV her zaman FV'den küçüktür.`,
    },
    {
      id: 6, hafta: 6, ad: "Anüiteler ve kredi", ozet: "Eşit ödemeler, taksit hesabı, birikim fonu, perpetüite", araclar: ["tvm", "odeme"],
      terimler: [["annuity", "anüite (eşit ödemeler dizisi)"], ["annuity due", "dönem başı anüite"], ["installment", "taksit"], ["amortization", "borç ödeme (amortisman)"], ["sinking fund", "birikim fonu"], ["perpetuity", "süresiz anüite (perpetüite)"], ["geometric series", "geometrik dizi"]],
      md: R`Anüite, eşit aralıklarla yapılan eşit ödemeler dizisidir: kira, kredi taksiti, düzenli birikim. Her ödemeyi ayrı ayrı iskontolamak yerine geometrik dizi toplamından gelen kapalı formüller kullanılır.

## Formüller (dönem sonu ödeme, dönem faizi $i$, $n$ ödeme)
> $$FV = PMT\,\frac{(1+i)^n - 1}{i}$$

> $$PV = PMT\,\frac{1 - (1+i)^{-n}}{i}$$

> $$\text{Kredi taksiti: } PMT = PV\,\frac{i}{1 - (1+i)^{-n}}$$

> $$\text{Birikim fonu: } PMT = FV\,\frac{i}{(1+i)^n - 1}$$

> $$\text{Perpetüite: } PV = \frac{PMT}{i}$$

Ödemeler DÖNEM BAŞINDA yapılıyorsa her formül $(1+i)$ ile çarpılır.

**Nereden geliyor?** $PV = \dfrac{PMT}{1+i} + \dfrac{PMT}{(1+i)^2} + \dots + \dfrac{PMT}{(1+i)^n}$ bir geometrik dizidir; $S = a\dfrac{1 - q^n}{1 - q}$ toplam formülü yukarıdaki sonucu verir.

## İktisatta
- **Kredi:** her taksitte önce kalan borcun faizi ödenir, artanı anaparayı düşürür. Bu yüzden ilk taksitlerde faiz payı büyüktür.
- **Tahvil fiyatı:** kuponların anüite değeri + vadedeki anaparanın bugünkü değeri.
- **Perpetüite:** her yıl sonsuza kadar 1000 TL ödeyen bir varlık %10 faizde 10 000 TL eder.

## Çözümlü örnek
100 000 TL kredi, aylık %3, 12 taksit:

$$PMT = 100000\cdot\frac{0.03}{1 - 1.03^{-12}} = \frac{3000}{0.29862} \approx 10\,046.21$$

Toplam ödeme $120\,554.5$, toplam faiz $20\,554.5$. İlk ay faizi $3000$, anaparaya giden $7046.21$.

## Sık yapılan hatalar
- $n$'yi yıl, $i$'yi aylık almak: ikisi aynı DÖNEME göre olmalı.
- Dönem başı ödemede $(1+i)$ çarpanını unutmak.
- Toplam faizi "oran × anapara × süre" diye hesaplamak: borç azaldıkça faiz de azalır.`,
    },
    {
      id: 7, hafta: 7, ad: "Büyüme ve yatırım değerlendirme", ozet: "Bileşik büyüme oranı, net bugünkü değer, iç verim oranı", araclar: ["buyume", "nbd"],
      terimler: [["growth rate", "büyüme oranı"], ["compound annual growth rate", "bileşik yıllık büyüme oranı"], ["net present value", "net bugünkü değer"], ["internal rate of return", "iç verim oranı"], ["cash flow", "nakit akışı"], ["discount rate", "iskonto oranı"], ["opportunity cost", "fırsat maliyeti"]],
      md: R`Akraba iki soru: (1) Bir büyüklük ortalama ne hızla büyüdü? (2) Gelecekte nakit getiren bir yatırım bugün yapılmaya değer mi?

## Büyüme oranları
> $$\text{Bileşik ortalama: } g = \left(\frac{y_n}{y_0}\right)^{1/n} - 1$$

> $$\text{Sürekli: } k = \frac{\ln(y_n/y_0)}{n},\qquad \text{katlanma: } t = \frac{\ln 2}{\ln(1+g)}$$

Toplam değişimi yıl sayısına bölmek (aritmetik ortalama) bileşik büyümeyi abartır.

## Net bugünkü değer ve iç verim oranı
> $$NBD = \sum_{t=0}^{n}\frac{CF_t}{(1+r)^t} = CF_0 + \frac{CF_1}{1+r} + \frac{CF_2}{(1+r)^2} + \dots$$

- $CF_0$ genelde negatiftir (yatırım). $r$ iskonto oranı: paranın başka yerdeki getirisi, yani fırsat maliyeti.
- **Karar:** NBD > 0 ise yatırım yapılır.
- **İç verim oranı:** NBD'yi sıfır yapan $r$. IRR > r ise yatırım yapılır. Akışlar birden fazla kez işaret değiştirirse birden çok IRR olabilir; o zaman NBD'ye güven.

## Çözümlü örnek
Yatırım 1000; sonraki üç yıl 300, 400, 500; $r = \%10$.

$NBD = -1000 + \dfrac{300}{1.1} + \dfrac{400}{1.21} + \dfrac{500}{1.331} = -1000 + 272.73 + 330.58 + 375.66 = -21.04$

NBD < 0, yapılmamalı. IRR ≈ %8.90 < %10, aynı karar.

**Büyüme:** GSYH 5 yılda 1000'den 1500'e çıktıysa $g = 1.5^{1/5} - 1 \approx \%8.45$. Aritmetik ortalama %10 der — yanlış.

## Sık yapılan hatalar
- $CF_0$'ı iskontolamak ($t = 0$'da çarpan 1'dir).
- Yıllık oranla aylık akışları iskontolamak.
- Reel akışları nominal faizle iskontolamak: ikisi aynı türden olmalı.`,
    },
    { id: 8, hafta: 8, ad: "Ara sınav", sinav: true },
    {
      id: 9, hafta: 9, ad: "Türev ve türev alma kuralları", ozet: "Limit, teğet, kuvvet–çarpım–bölüm–zincir kuralları", araclar: ["turev"],
      terimler: [["derivative", "türev"], ["differentiation", "türev alma"], ["limit", "limit"], ["tangent line", "teğet doğrusu"], ["power / product / quotient rule", "kuvvet / çarpım / bölüm kuralı"], ["chain rule", "zincir kuralı"], ["second derivative", "ikinci türev"], ["partial derivative", "kısmi türev"]],
      md: R`Türev, ANLIK değişim hızıdır: x çok az değişince f'nin ne kadar değiştiği. Geometrik olarak, grafiğe o noktada çizilen teğetin eğimidir.

> $$f'(x) = \lim_{h \to 0}\frac{f(x+h) - f(x)}{h}$$

Gösterimler: $f'(x)$, $\dfrac{dy}{dx}$, $\dfrac{df}{dx}$. İkinci türev $f''(x)$ eğimin değişim hızıdır (eğrilik).

## Kurallar
> $$(c)' = 0,\qquad (x^n)' = nx^{n-1},\qquad (cf)' = cf',\qquad (f \pm g)' = f' \pm g'$$

> $$\text{Çarpım: } (fg)' = f'g + fg'$$

> $$\text{Bölüm: } \left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}$$

> $$\text{Zincir: } \frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$$

> $$(e^x)' = e^x,\quad (e^u)' = e^u u',\quad (\ln x)' = \frac{1}{x},\quad (\ln u)' = \frac{u'}{u},\quad (a^x)' = a^x \ln a$$

## Teğet doğrusu
$x_0$ noktasındaki teğet $y = f(x_0) + f'(x_0)(x - x_0)$. Yakın noktalarda fonksiyonun doğrusal yaklaşımıdır: $f(x_0 + \Delta x) \approx f(x_0) + f'(x_0)\,\Delta x$.

## Kısmi türev (önizleme)
Birden fazla değişken varsa ötekiler sabit tutulup birine göre türev alınır: $Q = 10K^{0.3}L^{0.7} \Rightarrow \dfrac{\partial Q}{\partial L} = 7K^{0.3}L^{-0.3}$.

## Çözümlü örnek
**Zincir:** $f(x) = (3x^2 + 1)^4$; dış fonksiyon $u^4$, iç $u = 3x^2 + 1$.
$f'(x) = 4(3x^2 + 1)^3 \cdot 6x = 24x(3x^2 + 1)^3$.

**Çarpım:** $g(x) = x^2 e^{-x}$; $g'(x) = 2xe^{-x} - x^2e^{-x} = xe^{-x}(2 - x)$.

**Bölüm:** $h(x) = \dfrac{\ln x}{x}$; $h'(x) = \dfrac{(1/x)\,x - \ln x}{x^2} = \dfrac{1 - \ln x}{x^2}$.

## Sık yapılan hatalar
- Zincirde iç türevi unutmak: $(e^{2x})' = 2e^{2x}$.
- Çarpımın türevini türevlerin çarpımı sanmak.
- $(\ln 5)' = 1/5$ yazmak: $\ln 5$ bir sabittir, türevi 0.
- Bölüm kuralında paydaki sırayı ters yazmak.`,
    },
    {
      id: 10, hafta: 10, ad: "Marjinal analiz ve esneklik", ozet: "MC, MR, MPC; ortalama–marjinal ilişkisi; nokta ve yay esnekliği", araclar: ["marjinal", "esneklik", "turev"],
      terimler: [["marginal cost / revenue", "marjinal maliyet / gelir"], ["marginal product", "marjinal ürün"], ["average cost", "ortalama maliyet"], ["marginal propensity to consume", "marjinal tüketim eğilimi"], ["marginal utility", "marjinal fayda"], ["price elasticity of demand", "talebin fiyat esnekliği"], ["elastic / inelastic", "esnek / inelastik"]],
      md: R`İktisatta "marjinal" türev demektir: bir birim daha üretmenin, satmanın ya da tüketmenin toplam üzerindeki ek etkisi.

## Marjinal kavramlar
| toplam | marjinal | anlamı |
|---|---|---|
| TC(Q) | MC = TC′(Q) | bir birim daha üretmenin ek maliyeti |
| TR(Q) | MR = TR′(Q) | bir birim daha satmanın ek geliri |
| Q(L) | MPL = Q′(L) | bir işçi daha çalıştırmanın ek ürünü |
| C(Y) | MPC = C′(Y) | gelirdeki 1 TL artışın tüketime giden kısmı |
| U(x) | MU = U′(x) | bir birim daha tüketmenin ek faydası |

Türev, bir birimlik gerçek farkın yaklaşığıdır: $MC(Q) \approx TC(Q+1) - TC(Q)$.

**Ortalama ve marjinal:** $AC = TC/Q$. Marjinal ortalamanın altındaysa ortalamayı aşağı çeker, üstündeyse yukarı çeker. Bu yüzden MC eğrisi AC'yi tam en düşük noktasından keser: $MC = AC$.

## Esneklik
> $$\varepsilon = \frac{\%\Delta Q}{\%\Delta P} = \frac{dQ}{dP}\cdot\frac{P}{Q}$$

> $$\text{Yay (orta nokta): } \varepsilon = \frac{\Delta Q / \bar Q}{\Delta P / \bar P}$$

- $|\varepsilon| > 1$ esnek, $|\varepsilon| < 1$ inelastik, $|\varepsilon| = 1$ birim esnek.
- **Gelirle bağı:** $MR = P\left(1 + \dfrac{1}{\varepsilon}\right)$. Talep esnekse ($\varepsilon < -1$) $MR > 0$: fiyatı düşürmek geliri artırır. Doğrusal talepte gelir, esnekliğin $-1$ olduğu orta noktada en büyüktür.
- Aynı formül gelir esnekliği ($\frac{dQ}{dY}\frac{Y}{Q}$) ve çapraz esneklik için de geçer.
- **Log kısayolu:** $\varepsilon = \dfrac{d\ln Q}{d\ln P}$. $Q = AP^{-b}$ ise esneklik her noktada $-b$'dir (sabit esneklikli talep).

## Çözümlü örnek
$Q = 120 - 3P$, $P = 30$: $Q = 30$, $dQ/dP = -3$, $\varepsilon = -3\cdot\frac{30}{30} = -3$. Esnek: fiyat %1 artarsa talep %3 düşer, toplam harcama azalır. Birim esneklik: $\dfrac{-3P}{120 - 3P} = -1 \Rightarrow P = 20$.

$TC = 0.1Q^3 - 2Q^2 + 15Q + 100$: $MC = 0.3Q^2 - 4Q + 15$, $Q = 10$'da $MC = 5$. Gerçek fark $TC(11) - TC(10) = 156.1 - 150 = 6.1$; türev yaklaşık değeri verir.

## Sık yapılan hatalar
- Esnekliği eğimle karıştırmak: doğrusal talepte eğim sabittir ama esneklik her noktada farklıdır.
- Ters talepte $dP/dQ$'yu $dQ/dP$ sanmak: $\dfrac{dQ}{dP} = 1 \Big/ \dfrac{dP}{dQ}$.
- İşareti atmak: talep esnekliği negatiftir; "esnek mi" sorusunda mutlak değere bakılır.`,
    },
    {
      id: 11, hafta: 11, ad: "Optimizasyon: maksimum ve minimum", ozet: "Birinci ve ikinci sıra koşul, konkavlık, kâr maksimizasyonu", araclar: ["ekstremum", "kar", "marjinal"],
      terimler: [["optimization", "optimizasyon (eniyileme)"], ["critical point", "kritik nokta"], ["first / second order condition", "birinci / ikinci sıra koşul"], ["local / global maximum", "yerel / mutlak maksimum"], ["concave / convex", "içbükey / dışbükey"], ["inflection point", "büküm noktası"], ["profit maximization", "kâr maksimizasyonu"]],
      md: R`Bir fonksiyonun en büyük ya da en küçük değerini aramak iktisadın merkez sorusudur: kârı en büyük, maliyeti en küçük yap.

## Adımlar
1. **Birinci sıra koşul (FOC):** $f'(x) = 0$ — kritik noktalar. Türevin tanımsız olduğu noktalar ve aralığın uçları da adaydır.
2. **İkinci sıra koşul (SOC):** $f''(x^*) < 0$ ise yerel maksimum, $f''(x^*) > 0$ ise yerel minimum. $f''(x^*) = 0$ ise test sonuç vermez; $f'$'nün işaret değişimine bakılır.
3. **Kapalı aralıkta $[a, b]$:** kritik noktalardaki ve UÇLARDAKİ değerler karşılaştırılır; en büyüğü mutlak maksimumdur.

**Konkavlık:** $f'' < 0$ içbükey (∩), $f'' > 0$ dışbükey (∪). $f''$'nün işaret değiştirdiği nokta büküm noktasıdır.

## İktisatta
> $$\text{Kâr: } \pi'(Q) = 0 \iff MR = MC,\qquad \pi''(Q) < 0$$

> $$\text{Ortalama maliyet en düşük: } MC = AC$$

> $$\text{Gelir en büyük: } MR = 0 \;\;(|\varepsilon| = 1)$$

- Tam rekabette fiyat sabittir, $MR = P$: firma $P = MC$ olana kadar üretir.
- Monopolde $MR < P$: monopol daha az üretir, daha yüksek fiyat alır.
- **Vergi geliri:** $T(t) = t\cdot Q(t)$ fonksiyonunun türevi sıfıra eşitlenerek en çok gelir getiren vergi bulunur.

## Çözümlü örnek
$P = 100 - 2Q$, $TC = 50 + 10Q + 0.5Q^2$.

$TR = 100Q - 2Q^2 \Rightarrow MR = 100 - 4Q$; $MC = 10 + Q$.

$MR = MC$: $100 - 4Q = 10 + Q \Rightarrow Q^* = 18$, $P^* = 64$.

SOC: $\pi'' = -4 - 1 = -5 < 0$, maksimum. $\pi^* = 64\cdot 18 - (50 + 180 + 162) = 1152 - 392 = 760$.

## Sık yapılan hatalar
- Yalnız FOC'u yazıp SOC'u kontrol etmemek: bulduğun nokta minimum olabilir.
- Kapalı aralıkta uç noktaları unutmak.
- Kâr yerine geliri en büyük yapmak: $MR = 0$ ile $MR = MC$ farklı sonuç verir.`,
    },
    {
      id: 12, hafta: 12, ad: "İntegral", ozet: "İlkel fonksiyon, integral kuralları, yerine koyma, belirli integral", araclar: ["integral"],
      terimler: [["integral", "integral"], ["antiderivative", "ilkel fonksiyon"], ["indefinite / definite integral", "belirsiz / belirli integral"], ["constant of integration", "integral sabiti"], ["integration by substitution", "değişken değiştirme (yerine koyma)"], ["integration by parts", "kısmi integrasyon"], ["fundamental theorem of calculus", "analizin temel teoremi"], ["improper integral", "has olmayan integral"]],
      md: R`İntegral türevin tersidir (ilkel fonksiyon) ve aynı zamanda eğri altındaki alandır. Marjinalden toplama dönmek için kullanılır.

## Belirsiz integral kuralları
> $$\int x^n\,dx = \frac{x^{n+1}}{n+1} + C \qquad (n \ne -1)$$

> $$\int \frac{1}{x}\,dx = \ln|x| + C,\qquad \int e^{kx}\,dx = \frac{e^{kx}}{k} + C,\qquad \int a^x\,dx = \frac{a^x}{\ln a} + C$$

> $$\int [f \pm g]\,dx = \int f\,dx \pm \int g\,dx,\qquad \int cf\,dx = c\int f\,dx$$

$C$ integral sabitidir: sabitin türevi 0 olduğundan ilkel fonksiyon ancak bir sabite kadar belirlidir.

## Teknikler
- **Yerine koyma:** $\int f(g(x))\,g'(x)\,dx$ için $u = g(x)$. Örnek: $\int 2x(x^2 + 1)^5\,dx$, $u = x^2 + 1$ ile $\dfrac{(x^2 + 1)^6}{6} + C$.
- **Kısmi integral:** $\int u\,dv = uv - \int v\,du$. Örnek: $\int xe^x\,dx = xe^x - e^x + C$.

## Belirli integral
> $$\int_a^b f(x)\,dx = F(b) - F(a)$$

Eğri x ekseninin altındaysa integral negatif çıkar; toplam ALAN için $|f|$'nin integrali alınır.

## Çözümlü örnek
$\displaystyle\int_0^2 (3x^2 - 4x + 5)\,dx = \Big[x^3 - 2x^2 + 5x\Big]_0^2 = (8 - 8 + 10) - 0 = 10$

$\displaystyle\int_0^{\infty} 100e^{-0.05t}\,dt = \Big[-2000e^{-0.05t}\Big]_0^{\infty} = 0 - (-2000) = 2000$ (has olmayan integral).

## Sık yapılan hatalar
- Belirsiz integralde $C$'yi unutmak.
- $\int x^{-1}dx$'e kuvvet kuralını uygulamak: $\frac{x^0}{0}$ tanımsızdır, doğrusu $\ln|x|$.
- $\int e^{3x}dx = e^{3x}$ yazmak; doğrusu $\dfrac{e^{3x}}{3}$.
- Çarpımın integralini integrallerin çarpımı sanmak.`,
    },
    {
      id: 13, hafta: 13, ad: "Alan, tüketici ve üretici artığı", ozet: "İki eğri arası alan, artıklar, Lorenz eğrisi ve Gini", araclar: ["artik", "denge", "integral"],
      terimler: [["consumer surplus", "tüketici artığı"], ["producer surplus", "üretici artığı"], ["area between curves", "eğriler arası alan"], ["deadweight loss", "ölü ağırlık kaybı"], ["Lorenz curve", "Lorenz eğrisi"], ["Gini coefficient", "Gini katsayısı"]],
      md: R`Belirli integral iki eğri arasındaki alanı ölçer. İktisatta bu alanlar refahı ölçer.

## Formüller
> $$\text{Eğriler arası alan: } \int_a^b [f(x) - g(x)]\,dx \qquad (f \ge g)$$

> $$TA = \int_0^{Q^*} D(Q)\,dQ - P^*Q^*$$

> $$ÜA = P^*Q^* - \int_0^{Q^*} S(Q)\,dQ$$

$D(Q)$ ters talep (ödemeye razı olunan en yüksek fiyat), $S(Q)$ ters arz (kabul edilen en düşük fiyat).

**Sezgi:** her birim için tüketici "en fazla $D(Q)$ öderdim ama $P^*$ ödedim" der; bu farkların toplamı tüketici artığıdır. Vergi gibi bir müdahale toplam artığı küçültür; kaybolan kısım ölü ağırlık kaybıdır.

## Lorenz eğrisi ve Gini
Lorenz eğrisi $L(x)$: nüfusun en yoksul $x$ oranının toplam gelirden aldığı pay; $L(0) = 0$, $L(1) = 1$, $L(x) \le x$.

> $$G = 2\int_0^1 [x - L(x)]\,dx$$

$G = 0$ tam eşitlik, $G \to 1$ tam eşitsizlik. Örnek: $L(x) = x^2$ ise $G = 2\left(\frac12 - \frac13\right) = \frac13$.

## Çözümlü örnek
$D(Q) = 120 - Q^2$, $S(Q) = 20 + 3Q$. Denge: $Q^2 + 3Q - 100 = 0 \Rightarrow Q^* \approx 8.612$, $P^* \approx 45.84$.

$TA = \displaystyle\int_0^{Q^*}(120 - Q^2)\,dQ - P^*Q^* = \frac{2}{3}Q^{*3} \approx 425.8$

$ÜA = P^*Q^* - \displaystyle\int_0^{Q^*}(20 + 3Q)\,dQ = 1.5\,Q^{*2} \approx 111.2$

## Sık yapılan hatalar
- Artık hesabında integrali 0'dan başlatmamak.
- $P^*Q^*$ dikdörtgenini çıkarmayı unutmak.
- $Q = f(P)$ biçimindeki talebi ters çevirmeden $dQ$'ya göre integrallemek.`,
    },
    {
      id: 14, hafta: 14, ad: "Toplam fonksiyon ve akımlar", ozet: "Marjinalden toplama, stok–akım, gelir akışının bugünkü değeri", araclar: ["toplam", "akim"],
      terimler: [["total cost function", "toplam maliyet fonksiyonu"], ["initial condition", "başlangıç koşulu"], ["stock / flow", "stok / akım"], ["capital accumulation", "sermaye birikimi"], ["income stream", "gelir akışı"], ["average value", "ortalama değer"]],
      md: R`Marjinal biliniyorsa toplam, integralle geri kurulur. Zamana yayılmış akımların (gelir, yatırım) birikimi ve bugünkü değeri de integralle hesaplanır.

## Marjinalden toplama
> $$TC(Q) = \int MC(Q)\,dQ + C,\qquad C = TC(0) = FC$$

> $$TC(Q_2) - TC(Q_1) = \int_{Q_1}^{Q_2} MC(Q)\,dQ$$

Aynı mantıkla $TR = \int MR\,dQ$ (sabit 0'dır çünkü $TR(0) = 0$) ve tüketim fonksiyonu $C(Y) = \int MPC\,dY + C_0$.

## Stok ve akım
Sermaye stoku, net yatırım akımının birikimidir: $K(t) = K(0) + \displaystyle\int_0^t I(s)\,ds$.

## Gelir akışının değeri
Sürekli gelen $R(t)$ geliri, sürekli faiz $r$ ile:

> $$PV = \int_0^T R(t)\,e^{-rt}\,dt,\qquad FV = e^{rT}\cdot PV$$

> $$\text{Sabit akış: } PV = R\,\frac{1 - e^{-rT}}{r} \;\xrightarrow{\;T \to \infty\;}\; \frac{R}{r}$$

## Ortalama değer
$[a, b]$ aralığında $f$'nin ortalaması: $\bar f = \dfrac{1}{b - a}\displaystyle\int_a^b f(x)\,dx$.

## Çözümlü örnek
$MC = 3Q^2 - 12Q + 20$, $FC = 50$: $TC(Q) = Q^3 - 6Q^2 + 20Q + 50$.

Üretimi 2'den 5'e çıkarmanın ek maliyeti: $\displaystyle\int_2^5 MC\,dQ = TC(5) - TC(2) = 125 - 74 = 51$.

Yıllık 1000 TL'lik sonsuz akış, %8: $PV = 1000/0.08 = 12\,500$.

## Sık yapılan hatalar
- Başlangıç koşulunu kullanmayıp $C$'yi açık bırakmak.
- Değişimi bulmak için sabit maliyete gerek olmadığını unutmak: $\int_{Q_1}^{Q_2}$'de $C$ sadeleşir.
- Akış hesabında $e^{-rt}$ yerine $e^{rt}$ yazmak.`,
    },
    { id: 15, hafta: 15, ad: "Final", sinav: true },
    {
      id: 20, ek: true, ad: "Matrisler", ozet: "İşlemler, determinant, ters matris, Cramer, Leontief", araclar: ["matris", "sistem"],
      terimler: [["matrix", "matris"], ["determinant", "determinant"], ["inverse matrix", "ters matris"], ["transpose", "devrik"], ["identity matrix", "birim matris"], ["singular", "tekil"], ["Cramer's rule", "Cramer kuralı"], ["input–output model", "girdi–çıktı modeli"], ["rank", "rank (kerte)"]],
      md: R`Matris, sayıların dikdörtgen tablosudur. Çok denklemli doğrusal sistemi tek satırda ($Ax = b$) yazmayı sağlar. İktisatta en bilinen kullanımı Leontief girdi–çıktı modelidir.

## İşlemler
- **Toplama:** aynı boyutta, eleman eleman.
- **Çarpım:** $(m\times n)(n\times p) = (m\times p)$, $(AB)_{ij} = \sum_k a_{ik}b_{kj}$. Genelde $AB \ne BA$.
- **Devrik:** $(A^T)_{ij} = a_{ji}$.

## Determinant
> $$\det\begin{bmatrix}a & b\\ c & d\end{bmatrix} = ad - bc$$

3×3 için birinci satıra göre açılım (işaretler + − +):

> $$\det A = a_{11}M_{11} - a_{12}M_{12} + a_{13}M_{13}$$

$M_{ij}$: $i$. satır ve $j$. sütun silinince kalan 2×2'nin determinantı. $\det A = 0$ ise matris tekildir: tersi yoktur, sistemin tek çözümü yoktur.

## Ters matris ve Cramer
> $$A^{-1} = \frac{1}{ad - bc}\begin{bmatrix}d & -b\\ -c & a\end{bmatrix},\qquad x = A^{-1}b$$

> $$\text{Cramer: } x_i = \frac{\det A_i}{\det A}$$

$A_i$: $A$'nın $i$. sütunu yerine $b$ yazılmış matris.

## Leontief modeli
$a_{ij}$: $j$ sektörünün 1 birimlik üretimi için $i$ sektöründen gereken girdi. Toplam üretim = ara kullanım + nihai talep:

> $$x = Ax + d \;\Rightarrow\; x = (I - A)^{-1}d$$

## Çözümlü örnek
$2x + 3y = 8$, $x - y = -1$. $\det A = 2(-1) - 3(1) = -5$.

$x = \dfrac{8(-1) - 3(-1)}{-5} = \dfrac{-5}{-5} = 1$, $\quad y = \dfrac{2(-1) - 8(1)}{-5} = \dfrac{-10}{-5} = 2$.

## Sık yapılan hatalar
- Boyutları uyuşmayan matrisleri çarpmak.
- 3×3 açılımda ortadaki terimin eksi işaretini unutmak.
- $(AB)^{-1} = A^{-1}B^{-1}$ sanmak; doğrusu $B^{-1}A^{-1}$.`,
    },
  ];

  // Ders 28 Eylül 2026 Pazartesi başladı; tatiller hafta numarasını kaydırabilir (yaklaşık)
  const BASLANGIC = new Date(2026, 8, 28).getTime();
  function buHafta() {
    const h = Math.floor((Date.now() - BASLANGIC) / (7 * 864e5)) + 1;
    return h >= 1 && h <= 15 ? h : null;
  }

  const { el, isle, titret, depo } = Uyg;
  let kok;

  function sozlukMd() {
    const tum = [];
    for (const k of KONULAR) for (const [en, tr] of k.terimler || []) tum.push([en, tr, k]);
    tum.sort((a, b) => a[0].localeCompare(b[0], "en"));
    return "Ders İngilizce; sınav soruları da. Her terimin yanında geçtiği konu var.\n\n| İngilizce | Türkçe | konu |\n|---|---|---|\n" +
      tum.map(([en, tr, k]) => `| ${en} | ${tr} | ${k.ek ? "Ek" : k.hafta + ". hafta"} |`).join("\n");
  }

  function listeCiz(filtre = "") {
    kok.innerHTML = "";
    const ara = el("input", { class: "yuva", type: "search", placeholder: "Konu ya da terim ara (ör. esneklik, NPV)", value: filtre, "aria-label": "Konularda ara" });
    let zaman;
    ara.addEventListener("input", () => { clearTimeout(zaman); zaman = setTimeout(() => { const pos = ara.selectionStart; listeCiz(ara.value); const y = kok.querySelector("input"); y.focus(); y.setSelectionRange(pos, pos); }, 250); });
    kok.append(el("div", { class: "ara-kutu" }, ara));
    const liste = el("div", { class: "liste" });
    const bh = buHafta();
    const f = katla(filtre.trim());
    const uyar = (k) => !f || katla([k.ad, k.ozet, (k.terimler || []).flat().join(" "), k.md || ""].join(" ")).includes(f);
    let son = null;
    const grupBas = (sol, sag) => liste.append(el("div", { class: "grup-bas" }, el("span", { class: "hafta", text: sol }), el("span", { text: sag })));
    for (const k of KONULAR) {
      if (!uyar(k) || (k.sinav && f)) continue;
      const grup = k.ek ? "ek" : k.hafta <= 8 ? "ilk" : "ikinci";
      if (grup !== son) {
        if (grup === "ilk") grupBas("1–7. hafta", "Ara sınava kadar");
        if (grup === "ikinci") grupBas("9–14. hafta", "Finale kadar");
        if (grup === "ek") grupBas("Ek", "Müfredat dışı ama işe yarar");
        son = grup;
      }
      if (k.sinav) {
        liste.append(el("div", { class: "satir sinav" }, el("span", { class: "s-hafta", text: String(k.hafta) }), el("div", { class: "s-ad", text: k.ad + (bh === k.hafta ? " — bu hafta" : "") })));
        continue;
      }
      liste.append(el("button", { class: "satir konu", type: "button", onclick: () => { titret(); Uyg.git("konular/" + k.id); } },
        el("span", { class: "s-hafta", text: k.ek ? "+" : String(k.hafta) }),
        el("div", null, el("div", { class: "s-ad" }, k.ad, bh === k.hafta ? el("span", { class: "bu-hafta", text: "bu hafta" }) : null), el("div", { class: "s-not", text: k.ozet })),
        el("span", { class: "s-ok", "aria-hidden": "true" })));
    }
    if (!f || katla("sozluk ingilizce turkce terim glossary").includes(f) || KONULAR.some((k) => (k.terimler || []).some((t) => katla(t.join(" ")).includes(f)))) {
      if (son !== "ek") grupBas("Ek", "Müfredat dışı ama işe yarar");
      liste.append(el("button", { class: "satir konu", type: "button", onclick: () => Uyg.git("konular/sozluk") },
        el("span", { class: "s-hafta", text: "+" }),
        el("div", null, el("div", { class: "s-ad", text: "Sözlük: İngilizce–Türkçe" }), el("div", { class: "s-not", text: "Tüm konulardaki terimler, alfabetik" })),
        el("span", { class: "s-ok", "aria-hidden": "true" })));
    }
    if (!liste.querySelector(".satir")) liste.append(el("div", { class: "bos-not", text: `“${filtre}” hiçbir konuda geçmiyor. Daha kısa bir kelime dene.` }));
    kok.append(liste);
  }

  // Telefon dar: "a = b,\qquad c = d" gibi yan yana formülleri alt alta diz (gathered).
  // Yalnız virgülle ayrılmış listeler bölünür; matris içindeki \quad'lara dokunulmaz.
  function altAlta(md) {
    return md.replace(/\$\$([\s\S]+?)\$\$/g, (tum, ic) => {
      if (/\\begin\{[bv]matrix\}[\s\S]*,\s*\\q?quad[\s\S]*\\end/.test(ic)) return tum;
      const parca = ic.split(/,\s*\\q?quad\s*/);
      if (parca.length < 2) return tum;
      return "$$\\begin{gathered}" + parca.join(" \\\\[6pt] ") + "\\end{gathered}$$";
    });
  }

  // Türkçe harfleri ASCII'ye katla: "Esneklik" araması "ESNEKLİK" ile de eşleşsin
  function katla(s) {
    return String(s).replace(/[İIı]/g, "i").toLowerCase().replace(/[ç]/g, "c").replace(/[ğ]/g, "g").replace(/[ö]/g, "o").replace(/[ş]/g, "s").replace(/[ü]/g, "u").replace(/[âî]/g, (c) => ({ â: "a", î: "i" }[c]));
  }

  function konuCiz(id) {
    kok.innerHTML = "";
    const sayfa = el("div", { class: "konu-sayfa" });
    if (id === "sozluk") {
      const k = el("div", { class: "kagit" });
      k.innerHTML = "<h1>Sözlük</h1>" + isle(sozlukMd());
      sayfa.append(k);
      kok.append(sayfa);
      kok.scrollTop = 0;
      return;
    }
    const konu = KONULAR.find((k) => String(k.id) === String(id));
    if (!konu || konu.sinav) { listeCiz(); return; }
    const k = el("div", { class: "kagit" });
    const ust = konu.ek ? "Ek konu" : `${konu.hafta}. hafta`;
    let md = konu.md;
    if (konu.terimler && konu.terimler.length) md += "\n\n## Terimler\n\n| İngilizce | Türkçe |\n|---|---|\n" + konu.terimler.map(([en, tr]) => `| ${en} | ${tr} |`).join("\n");
    k.innerHTML = `<p class="adim-baslik" style="color:var(--murekkep-soluk)">${ust}</p><h1>${Uyg.kacis(konu.ad)}</h1>` + isle(altAlta(md));
    sayfa.append(k);
    kok.append(sayfa);

    const dug = el("div", { class: "konu-dugmeler" });
    for (const aid of konu.araclar || []) {
      const a = aid === "matris" ? { ad: "Matris hesapları" } : ARACLAR.find((x) => x.id === aid);
      if (a) dug.append(el("button", { class: "buyuk-tus gri", type: "button", text: a.ad, onclick: () => Uyg.git("araclar/" + aid) }));
    }
    dug.append(el("button", { class: "buyuk-tus", type: "button", text: "Bu konuyu DeepSeek'e sor", onclick: () => Uyg.sorHazirla(`${ust}, “${konu.ad}” konusunda takıldım: `) }));
    const sira = KONULAR.filter((x) => !x.sinav);
    const i = sira.indexOf(konu);
    if (sira[i + 1]) dug.append(el("button", { class: "buyuk-tus gri", type: "button", text: "Sonraki: " + sira[i + 1].ad, onclick: () => Uyg.git("konular/" + sira[i + 1].id) }));
    kok.append(dug);
    kok.scrollTop = 0;
    depo.koy("sonKonu", konu.id);
  }

  Uyg.kaydet("konular", {
    kur() { kok = document.getElementById("konuKaydir"); },
    goster(alt) { if (alt) konuCiz(alt); else listeCiz(); },
    baslik(alt) {
      if (alt === "sozluk") return "Sözlük";
      const k = KONULAR.find((x) => String(x.id) === String(alt));
      return k ? (k.ek ? k.ad : `${k.hafta}. hafta`) : "";
    },
  });

  window.KONULAR = KONULAR;
})();
