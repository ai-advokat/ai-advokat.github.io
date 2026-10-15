// Unified Workers AI text-generation contract for AI Advokat.
// One source of truth for model selection, request parameters and response extraction.
// Reasoning fields are intentionally never surfaced as user-visible answer text.

export const WORKERS_AI_TEXT_MODEL_DEFAULT="@cf/openai/gpt-oss-20b";

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

  const base={
    messages:safeMessages,
    max_tokens:maxTokens,
    temperature:Number.isFinite(Number(temperature))?Number(temperature):0.1
  };
  if(responseFormat) base.response_format=responseFormat;

  // Gemma reasoning must be explicitly disabled when this model is selected.
  if(resolved.includes("/gemma-4-")){
    base.chat_template_kwargs={enable_thinking:false};
    base.max_completion_tokens=maxTokens;
    delete base.max_tokens;
  }
  return base;
}

export function extractWorkersAIText(value,depth=0){
  if(depth>5 || value===null || value===undefined) return null;
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

  // Deliberately exclude "reasoning", "analysis" and chain-of-thought fields.
  for(const key of ["response","output_text","text","content","answer"]){
    const found=extractWorkersAIText(value[key],depth+1);
    if(found) return found;
  }

  const collections=[value.choices,value.output,value.data,value.result?.choices,value.response?.choices];
  for(const collection of collections){
    if(!Array.isArray(collection)) continue;
    for(const choice of collection){
      const found=extractWorkersAIText(
        choice?.message?.content
        ?? choice?.delta?.content
        ?? choice?.content
        ?? choice?.text,
        depth+1
      );
      if(found) return found;
    }
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
    choiceContentType:choice?.message ? typeof choice.message.content : null,
    choiceContentLength:typeof choice?.message?.content==="string"?choice.message.content.length:null,
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
  reasoningEffort="low"
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

  let generated;
  try{
    generated=await env.AI.run(resolvedModel,options);
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
