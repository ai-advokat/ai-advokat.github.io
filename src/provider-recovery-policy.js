// R21: a truncated OpenAI response may be retried once only when the
// provider explicitly reports an output-token budget exhaustion.
// A content-filtered or unknown incomplete response is NEVER replayed.
export function shouldRetryIncompleteOpenAI(result){
  return result?.error==="openai_incomplete_response"
    && result?.failureDetail==="max_output_tokens";
}

export function isTerminalOpenAIBillingFailure(result){
  return ["project_spend_limit_exceeded","billing_hard_limit_reached","insufficient_quota"]
    .includes(String(result?.responseStatus||"").toLowerCase());
}
