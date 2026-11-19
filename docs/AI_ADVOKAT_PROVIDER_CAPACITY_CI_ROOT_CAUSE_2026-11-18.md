# AI ADVOKAT — независна ревизија на продукциските AI падови
**Датум:** 18 ноември 2026 · **Издание:** `c5e07e37e38cba246a6ac1ed7c3dc6b651837160`  
**Режим:** AUDIT / READ ONLY · без продукциска промена, без финансиска обврска.

## Главен потврден корен
Cloudflare Workers AI го враќа кодот `4006`: исцрпена бесплатна дневна алокација од 10.000 neurons. Излезот го носи `workers_ai_daily_capacity_exhausted`, `daily_free_allocation_exhausted` и HTTP 503.

При обидот за резервно рутирање кон OpenAI е потврден HTTP 429 со `project_spend_limit_exceeded`, така што `handoffRecovered=false`. Двете патеки немаат расположлив капацитет за тој обид. Ова не е доказ за погрешен JavaScript, превод, CORS или неусогласен GitHub commit.

## Точни GitHub докази

| Workflow / job | Проверена грешка | Доказ |
|---|---|---|
| Worker runtime smoke #153 | AI chat HTTP 503; `daily_free_allocation_exhausted`, OpenAI 429 spend limit | [Job 134655236728](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365302/job/134655236728) |
| Root reliability #156 | Main chat HTTP 503; `main_chat_provider_capacity_blocked` | [Job 134655236417](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365352/job/134655236417) |
| FREE live UAT #981 | Runtime contract PASS; basic chat HTTP 503 по исцрпување Workers AI и неуспешен OpenAI fallback | [Job 134655238375](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365678/job/134655238375) |
| Translator layered #205 | M2M100 и GPT-OSS враќаат 503; OpenAI fallback 429 `project_spend_limit_exceeded`; DOM тестот истекува | [Job 134655236543](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365329/job/134655236543) |
| Microphone live #27 | `voice_transcription_capacity_exhausted` HTTP 503 | [Job 134655238257](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365600/job/134655238257) |
| R3 exact #31 | Повеќе R3 проверки враќаат HTTP 503 `openai_response_error` | [Job 134655236549](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365331/job/134655236549) |
| Professional L2-L3 #95 | L2 HTTP 503 `workers_ai_daily_capacity_exhausted`; L3 `canonical_corpus_no_model` PASS | [Job 134655236731](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261365282/job/134655236731) |
| Translator / Contract PRO #39 | English UI translation HTTP 503; live byte parity PASS | [Job 134654093265](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44261015436/job/134654093265) |

**Одвојно потврдено:** во root reliability GitHub Pages parity, Worker static/runtime health и изворните договори се PASS. Во Worker smoke asset parity, health, orchestrator, Hybrid и Public Legal Data APIs се PASS. Значи, неусогласена распоредена верзија **не е потврдена причина** за овие конкретни падови.

## Зошто има толку многу црвени Actions
`.github/workflows/production-runtime-sync.yml` се активира и за `index.html`; по успех повеќе `workflow_run` тестови истовремено вршат **живи AI повици**. Кога дневниот провајдерски капацитет веќе е исцрпен, сите зависни тестови паѓаат, иако изворните проверки и не-AI endpoints се исправни.

Претходно PR Translator acceptance покажува PASS за кандидатскиот код, но продукциската фаза е SKIPPED на PR. Микрофонската пред-продукциска фаза користи `|| true`. Затоа PR PASS и LIVE PROVIDER PASS мора да се прикажуваат одвоено.

## Системско затворање — без автоматска финансиска обврска
1. **Вистинит статус:** при провајдерско исцрпување прикажи `BLOCKED_PROVIDER_CAPACITY`, не `PASS`, не измислен AI одговор. Човечка правна контрола останува задолжителна.
2. **CI организација:** задржи PR security/source тестови; прво еден ограничен капацитетски preflight за жив провајдер, па скапи live UAT сценарија само кога има капацитет. Одвој ги локалните кодни грешки од надворешното ограничување.
3. **Трошок и оптоварување:** елиминирај истовремени повторени AI барања во независни тестови; воспостави ограничен серијален капацитетски прозорец и една доказна трага по издание.
4. **Безмоделен режим:** кога AI е недостапен, понуди проверлив регистар/корпус и канонски документи каде правниот статус го дозволува тоа, без претставување на статичка содржина како AI-правен совет.
5. **Преведувач:** претходно проверени статични интерфејсни преводи може да се кешираат; правните извори мора да останат source-faithful.
6. **Надворешен капацитет:** измена на Cloudflare план или OpenAI проектски spend limit е одлука на сопственикот; **не е преземена никаква платена акција**.

### Acceptance пред зелена продукција
- Chat: реален HTTP 200 со валиден провајдер и доказен статус.
- Translator: реален 200 за M2M100 или одобрен fallback, со DOM превод без мешање со правниот оригинал.
- Microphone: реален 200 со непразен транскрипт и непроменети правила за приватност.
- R3 / L2-L3: вистински премин низ сценарија, не само synthetic tests.
- Официјални правни извори и сите 53 единици остануваат под досегашниот `LEGAL HOLD` и `Human Gate`.

## Технички доказ за дијагностиката
Read-only run [44263838685](https://github.com/ai-advokat/ai-advokat.github.io/actions/runs/44263838685) собра 8 паднати workflow-и, со ID на job и категории. Поради заштита на доверливоста неговиот артефакт содржи само статуси/идентификатори, не сурови логови.

**Статус:** ROOT CAUSE VERIFIED (provider capacity); NOT RESOLVED LIVE; no production changes performed.
