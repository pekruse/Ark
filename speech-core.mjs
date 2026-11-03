export async function createDetector(runtime, progress_callback=()=>{}, device='wasm') {
 const {AutoProcessor,AutoModelForSpeechSeq2Seq,Tensor,env}=runtime;
 env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
 const id='onnx-community/whisper-tiny';
 const [processor,model]=await Promise.all([AutoProcessor.from_pretrained(id,{progress_callback}),AutoModelForSpeechSeq2Seq.from_pretrained(id,{dtype:'q8',device,progress_callback})]);
 return async function detect(audio){
  if(!(audio instanceof Float32Array)||audio.length<16000*2)throw Error('Please speak for at least two seconds.');
  let energy=0;for(const sample of audio)energy+=sample*sample;
  if(Math.sqrt(energy/audio.length)<.005)throw Error('The recording was too quiet. Please try again.');
  const inputs=await processor(audio),start=model.generation_config.decoder_start_token_id;
  const output=await model({...inputs,decoder_input_ids:new Tensor('int64',BigInt64Array.from([BigInt(start)]),[1,1])});
  const logits=output.logits.data,vocab=output.logits.dims.at(-1),offset=logits.length-vocab;
  const scores=Object.entries(model.generation_config.lang_to_id).map(([token,id])=>({language:token.slice(2,-2),logit:Number(logits[offset+id])}));
  const max=Math.max(...scores.map(x=>x.logit)),sum=scores.reduce((s,x)=>s+Math.exp(x.logit-max),0);
  scores.forEach(x=>x.confidence=Math.exp(x.logit-max)/sum);scores.sort((a,b)=>b.confidence-a.confidence);
  output.logits.dispose?.();
  const tokens=await model.generate({...inputs,language:scores[0].language,task:'transcribe',max_new_tokens:96,return_timestamps:false});
  const text=processor.batch_decode(tokens,{skip_special_tokens:true})[0].trim();
  return {text,language:scores[0].language,confidence:scores[0].confidence,margin:scores[0].confidence-scores[1].confidence};
 };
}
