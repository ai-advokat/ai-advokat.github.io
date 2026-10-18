// Unified Workers AI text-generation contract for AI Advokat.
// One source of truth for model selection, request parameters and response extraction.
// Reasoning fields are intentionally never surfaced as user-visible answer text.

export const WORKERS_AI_TEXT_MODEL_DEFAULT="@cf/qwen/qwen3-30b-a3b-fp8";
export const WORKERS_AI_REQUEST_CONTRACT_VERSION="WORKERS_AI_QWEN_VISIBLE_ANSWER_V4";

export function resolveWorkersAITextModel(env){
  const model=String(env?.WORKERS_AI_CHAT_MODEL||WORKERS_AI_TEXT_MODEL_DEFAULT).trim();
  return model||WORKERS_AI_TEXT_MODEL_DEFAULT;
}

export function workersAIRequestOptions({
  model,
  messages,
  maxOutputTokens=1800,
  temperature=0.1,
  responseFormat=null,
  reasoningEffort="low"
}={}){
  const resolved=String(model||WORKERS_AI_TEXT_MODEL_DEFAULT);
  const maxTokens=Math.max(256,Math.min(6000,Number(maxOutputTokens)||1800));
  const safeMessages=Array.isArray(messages)?messages:[];

  // GPT-OSS on Workers AI supports the Responses API shape directly through
  // The Workers AI binding accepts this Responses shape directly. Use it deliberately so reasoning effort is explicit and
  // bounded instead of letting a Chat Completions response consume the whole
  // completion budget on hidden reasoning and return empty final content.
  if(resolved.includes("/gpt-oss-")){
    return {
      input:safeMessages,
      reasoning:{effort:["low","medium","high"].includes(reasoningEffort)?reasoningEffort:"low"},
      max_output_tokens:maxTokens
    };
  }

  const qwenMessages=resolved.includes("/qwen3-30b-a3b-fp8")
    ? safeMessages.map(message=>({...message}))
    : safeMessages;
  if(resolved.includes("/qwen3-30b-a3b-fp8")){
    for(let i=qwenMessages.length-1;i>=0;i--){
      const message=qwenMessages[i];
      if(message?.role!=="user" || typeof message?.content!=="string") continue;
      if(!/\/no_think\b/i.test(message.content)){
        message.content=message.content.trimEnd()+"\n\n/no_think";
      }
      break;
    }
  }

  const base={
    messages:qwenMessages,
    max_tokens:maxTokens,
    temperature:Number.isFinite(Number(temperature))?Number(temperature):0.1
  };
  if(responseFormat) base.response_format=responseFormat;

  // Qwen3 is a reasoning-capable model. In FREE chat we need a fast visible
  // answer rather than spending the bounded completion budget on hidden
  // thinking. Cloudflare Workers AI supports chat_template_kwargs for
  // reasoning-mode control, so disable thinking while keeping max_tokens.
  if(resolved.includes("/qwen3-30b-a3b-fp8")){
    base.chat_template_kwargs={enable_thinking:false};
  }

  // Legacy GLM-4.7-Flash may otherwise spend the
  // entire small FREE completion budget on hidden thinking, returning no final
  // assistant text. FREE chat needs low-latency visible answers, so thinking is
  // disabled explicitly and the current completion-token field is used.
  if(resolved.includes("/glm-4.7-flash")){
    base.chat_template_kwargs={enable_thinking:false};
    base.reasoning_effort=null;
    base.max_completion_tokens=maxTokens;
    delete base.max_tokens;
  }


  // Gemma reasoning must be explicitly disabled when this model is selected.
  if(resolved.includes("/gemma-4-")){
    base.chat_template_kwargs={enable_thinking:false};
    base.max_completion_tokens=maxTokens;
    delete base.max_tokens;
  }
  return base;
}

export function extractWorkersAIText(value,depth=0){
  if(depth>6 || value===null || value===undefined) return null;
  if(typeof value==="string"){
    const trimmed=value.trim();
    return trimmed||null;
  }
  if(Array.isArray(value)){
    for(const item of value){
      const found=extractWorkersAIText(item,depth+1);
      if(found) return found;
    }
    return null;
  }
  if(typeof value!=="object") return null;

  const type=String(value.type||"").toLowerCase();
  if(type==="reasoning" || type==="analysis" || type==="reasoning_summary" || type==="summary_text"){
    return null;
  }
  if(type==="output_text" || type==="text"){
    return extractWorkersAIText(value.text,depth+1);
  }
  if(type==="message"){
    return extractWorkersAIText(value.content,depth+1);
  }

  // Some Workers AI model adapters return the final assistant message as a
  // nested object (for example in top-level response) rather than directly in
  // choices[].message.content. Only explicit assistant content is eligible;
  // reasoning_content is intentionally ignored.
  if(String(value.role||"").toLowerCase()==="assistant" && Object.prototype.hasOwnProperty.call(value,"content")){
    return extractWorkersAIText(value.content,depth+1);
  }

  // Explicit top-level final-answer fields are safe to prefer.
  for(const key of ["response","output_text","answer"]){
    const found=extractWorkersAIText(value[key],depth+1);
    if(found) return found;
  }

  // Chat-Completions compatibility: only assistant message/delta content.
  if(Array.isArray(value.choices)){
    for(const choice of value.choices){
      const found=extractWorkersAIText(
        choice?.message?.content ?? choice?.delta?.content ?? choice?.text,
        depth+1
      );
      if(found) return found;
    }
  }

  // Responses API: reasoning items are skipped by the type guard above; only
  // message/output_text items can yield a user-visible final answer.
  if(Array.isArray(value.output)){
    for(const item of value.output){
      const found=extractWorkersAIText(item,depth+1);
      if(found) return found;
    }
  }

  // Some Workers AI wrappers nest the provider result one level deeper.
  if(value.result && typeof value.result==="object"){
    const found=extractWorkersAIText(value.result,depth+1);
    if(found) return found;
  }
  if(Array.isArray(value.data)){
    const found=extractWorkersAIText(value.data,depth+1);
    if(found) return found;
  }

  return null;
}

export function workersAIShapeSummary(value){
  if(value===null) return {type:"null"};
  if(Array.isArray(value)) return {type:"array",length:value.length};
  if(typeof value!=="object") return {type:typeof value};
  const choice=Array.isArray(value.choices)?value.choices[0]:null;
  const usage=value.usage&&typeof value.usage==="object"?value.usage:{};
  const outputDetails=usage.output_tokens_details&&typeof usage.output_tokens_details==="object"
    ? usage.output_tokens_details
    : {};
  return {
    type:"object",
    keys:Object.keys(value).slice(0,20),
    status:typeof value.status==="string"?value.status:null,
    incompleteReason:value.incomplete_details?.reason||null,
    choiceCount:Array.isArray(value.choices)?value.choices.length:null,
    choiceFinishReason:typeof choice?.finish_reason==="string"?choice.finish_reason:null,
    choiceMessageKeys:choice?.message&&typeof choice.message==="object"
      ? Object.keys(choice.message).filter(key=>!/reason/i.test(key)).slice(0,8)
      : null,
    choiceContentType:choice?.message ? typeof choice.message.content : null,
    choiceContentKeys:choice?.message?.content && typeof choice.message.content==="object" && !Array.isArray(choice.message.content)
      ? Object.keys(choice.message.content).filter(key=>!/reason/i.test(key)).slice(0,8)
      : null,
    choiceContentArrayTypes:Array.isArray(choice?.message?.content)
      ? choice.message.content.slice(0,8).map(item=>String(item?.type||typeof item))
      : null,
    choiceContentLength:typeof choice?.message?.content==="string"?choice.message.content.length:null,
    responseKeys:value.response&&typeof value.response==="object"&&!Array.isArray(value.response)
      ? Object.keys(value.response).filter(key=>!/reason/i.test(key)).slice(0,12)
      : null,
    responseRole:value.response&&typeof value.response==="object" ? String(value.response.role||"")||null : null,
    responseContentType:value.response&&typeof value.response==="object" ? typeof value.response.content : null,
    responseContentArrayTypes:Array.isArray(value.response?.content)
      ? value.response.content.slice(0,8).map(item=>String(item?.type||typeof item))
      : null,
    outputCount:Array.isArray(value.output)?value.output.length:null,
    outputTypes:Array.isArray(value.output)?value.output.slice(0,8).map(x=>String(x?.type||"unknown")):null,
    resultKeys:value.result&&typeof value.result==="object"?Object.keys(value.result).slice(0,12):null,
    responseType:typeof value.response,
    inputTokens:Number.isFinite(Number(usage.input_tokens??usage.prompt_tokens))?Number(usage.input_tokens??usage.prompt_tokens):null,
    outputTokens:Number.isFinite(Number(usage.output_tokens??usage.completion_tokens))?Number(usage.output_tokens??usage.completion_tokens):null,
    reasoningTokens:Number.isFinite(Number(outputDetails.reasoning_tokens))?Number(outputDetails.reasoning_tokens):null
  };
}

export async function runWorkersAIText(env,{
  messages=[],
  maxOutputTokens=1800,
  temperature=0.1,
  responseFormat=null,
  model=null,
  reasoningEffort="low",
  sessionAffinity=null
}={}){
  if(!env?.AI || typeof env.AI.run!=="function"){
    return {ok:false,error:"workers_ai_not_configured"};
  }
  const resolvedModel=String(model||resolveWorkersAITextModel(env));
  const options=workersAIRequestOptions({
    model:resolvedModel,
    messages,
    maxOutputTokens,
    temperature,
    responseFormat,
    reasoningEffort
  });

  const affinity=String(sessionAffinity||"").trim();
  const bindingOptions=/^[A-Za-z0-9._:-]{8,128}$/.test(affinity)
    ? {extraHeaders:{"x-session-affinity":affinity}}
    : undefined;

  let generated;
  try{
    generated=await env.AI.run(resolvedModel,options,bindingOptions);
  }catch(error){
    return {
      ok:false,
      error:"workers_ai_provider_error",
      detail:String(error?.message||error).slice(0,240),
      model:resolvedModel,
      providerCalls:1
    };
  }

  const text=extractWorkersAIText(generated);
  if(!text){
    return {
      ok:false,
      error:"workers_ai_empty_response",
      detail:"Workers AI returned no usable final assistant text.",
      model:resolvedModel,
      providerCalls:1,
      shape:workersAIShapeSummary(generated)
    };
  }

  return {
    ok:true,
    text,
    model:resolvedModel,
    providerCalls:1,
    shape:workersAIShapeSummary(generated)
  };
}
