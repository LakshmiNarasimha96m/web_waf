import { inspectInput } from '../utils/wafRules.js';

export default function handler(req, res) {
  const rawInput = req.method === 'POST' ? req.body?.input : req.query?.input;
  const input = String(rawInput ?? '');
  const result = inspectInput(input);
  return res.status(200).json(result);
}
