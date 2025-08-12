import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { getSetting } from './settingsService';

// Use Tauri's fetch to bypass CORS
const fetch = tauriFetch;

export interface AISummaryArgs {
  period: 'weekly' | 'monthly';
  range: { startISO: string; endISO: string };
  plainMarkdown: string;
  style?: 'concise' | 'detailed';
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an assistant that creates concise, insightful summaries of completed tasks. Focus on themes, patterns, and notable accomplishments without including task IDs or speculative content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, response.statusText, errorText);
      
      if (response.status === 429) {
        console.error('Rate limit exceeded or no credits. Please check:');
        console.error('1. Add billing at https://platform.openai.com/account/billing');
        console.error('2. Check usage at https://platform.openai.com/usage');
        console.error('3. Wait a moment and try again');
      } else if (response.status === 401) {
        console.error('Invalid API key. Please check your OpenAI API key.');
      }
      
      return '';
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    return '';
  }
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  try {
    console.log('Calling Anthropic API...');
    
    const requestBody = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: 'You are an assistant that creates concise, insightful summaries of completed tasks. Focus on themes, patterns, and notable accomplishments without including task IDs or speculative content.'
    };
    
    console.log('Request body prepared, sending request...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response received:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, response.statusText, errorText);
      if (response.status === 401) {
        console.error('Authentication failed. Please check your API key.');
      }
      return '';
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  } catch (error) {
    console.error('Anthropic API call failed:', error);
    return '';
  }
}

export async function generatePolishedSummary(args: AISummaryArgs): Promise<string> {
  const provider = await getSetting('aiProvider');
  const apiKey = await getSetting('aiApiKey');

  console.log('AI Provider:', provider);
  console.log('API Key exists:', !!apiKey);
  console.log('API Key length:', apiKey ? String(apiKey).length : 0);
  console.log('API Key prefix:', apiKey ? String(apiKey).substring(0, 10) + '...' : 'none');

  if (!provider || provider === 'none' || !apiKey) {
    console.log('No AI provider or API key configured');
    return '';
  }

  const { period, range, plainMarkdown, style = 'concise' } = args;
  
  const prompt = `Please provide a ${style} AI summary for the following ${period} task completion report.

Period: ${range.startISO} to ${range.endISO}

${plainMarkdown}

Create a structured summary using EXACTLY this format:

**Key Themes:**
- [List 2-3 main themes or categories of work completed]

**Notable Achievements:**
- [List 1-2 significant accomplishments or milestones]

**Productivity Insights:**
- [1-2 observations about work patterns, peak days, or productivity trends]

**Areas of Focus:**
- [Identify the primary area(s) where most effort was spent]

${style === 'detailed' ? `**Recommendations:**
- [1-2 suggestions for the upcoming period based on patterns observed]` : ''}

Keep each point concise and actionable. Focus on insights rather than just counting tasks.`;

  try {
    if (provider === 'openai') {
      return await callOpenAI(prompt, apiKey as string);
    } else if (provider === 'anthropic') {
      return await callAnthropic(prompt, apiKey as string);
    }
  } catch (error) {
    console.error('AI summary generation failed:', error);
  }

  return '';
}