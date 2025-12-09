/**
 * Config Parser Service
 * 
 * AI-powered parsing of game config files using Groq SDK with structured JSON output.
 * Extracts action names, types, and intensities from raw config text.
 */

import Groq from 'groq-sdk';
import { GROQ_API_KEY } from '$env/static/private';
import { ActionType, ActionValue } from '$lib/types';
import type { BenchAction } from '$lib/stores/actionBench';

/**
 * Parsed action from AI response
 */
interface ParsedAction {
    name: string;
    type: 'TAP' | 'HOLD' | 'COMBO';
    intensity: number;
    category?: string;
    rawBinding?: string;
}

/**
 * AI response schema structure
 */
interface ParseResponse {
    actions: ParsedAction[];
}

/**
 * Generate a unique ID for new actions
 */
function generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Parse raw config text using Groq AI with structured JSON output
 */
export async function parseConfigWithAI(rawText: string): Promise<BenchAction[]> {
    if (!GROQ_API_KEY) {
        console.warn('GROQ_API_KEY not set, falling back to heuristic parser');
        return parseConfigHeuristic(rawText);
    }

    try {
        const groq = new Groq({ apiKey: GROQ_API_KEY });

        const response = await groq.chat.completions.create({
            model: 'moonshotai/kimi-k2-instruct-0905',
            messages: [
                {
                    role: 'system',
                    content: `You are an intelligent game keybind parser. Your job is to extract action bindings from ANY format of input - config files, settings screenshots text, key lists, game menus, or freeform descriptions.

FLEXIBLE PARSING - Handle ANY of these formats:
- Config files: bind "r" "+reload"
- Settings lists: "Jump - Space Bar" or "Jump\\nSpace Bar"
- Category groups: "Movement\\nCrouch\\nL-Ctrl" (where L-Ctrl is the key for Crouch)
- Key=Action: "E=Use"
- Simple lists: bullet points, numbered lists, or plain text

SMART EXTRACTION:
- Look for action names (Jump, Crouch, Reload, Ability 1, etc.)
- Identify the associated key binding if present (E, Space, L-Ctrl, Mouse Button 4, etc.)
- Skip non-action entries like "On", "Off", settings toggles, or section headers
- Group related items - if you see "Movement" followed by "Crouch" then "L-Ctrl", understand that L-Ctrl is the key for Crouch under Movement category

For each ACTION found (not keys, not toggles, not settings):
- name: Clean, readable action name (e.g., "Crouch", "Jump", "Weapon Slot 1")
- type: TAP (quick press), HOLD (sustained like crouch/sprint/aim), or COMBO (modifier combinations)
- intensity: 1-10 usage frequency:
  - 10: Jump, Primary Fire, Core movement
  - 8-9: Crouch, Sprint, Reload, Build
  - 5-7: Abilities, Use/Interact, Secondary actions
  - 1-4: Menus, Rare actions, Emotes
- category: Movement, Combat, Building, Abilities, Items, UI, or Other
- rawBinding: The key/binding if identified, otherwise the original text

IMPORTANT: Only extract actual GAME ACTIONS. Skip:
- Toggle settings ("On", "Off", "Enabled")
- Setting names without actions ("Turbo Building", "Confirm Edit on Release")
- Category headers used only for grouping`
                },
                {
                    role: 'user',
                    content: rawText
                }
            ],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    name: 'parsed_actions',
                    strict: true,
                    schema: {
                        type: 'object',
                        properties: {
                            actions: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        type: { type: 'string', enum: ['TAP', 'HOLD', 'COMBO'] },
                                        intensity: { type: 'number' },
                                        category: { type: 'string' },
                                        rawBinding: { type: 'string' }
                                    },
                                    required: ['name', 'type', 'intensity', 'category', 'rawBinding'],
                                    additionalProperties: false
                                }
                            }
                        },
                        required: ['actions'],
                        additionalProperties: false
                    }
                }
            },
            temperature: 0.3
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('Empty response from AI');
        }

        const parsed: ParseResponse = JSON.parse(content);
        return parsed.actions.map(action => ({
            id: generateId(),
            name: action.name,
            type: ActionType[action.type] ?? ActionType.TAP,
            intensity: Math.max(1, Math.min(10, Math.round(action.intensity))),
            value: intensityToValue(action.intensity),
            simultaneousWith: [],
            category: action.category,
            status: 'clean' as const,
            rawText: action.rawBinding,
            isEdited: false
        }));

    } catch (error) {
        console.error('AI parsing failed, falling back to heuristic:', error);
        return parseConfigHeuristic(rawText);
    }
}

/**
 * Convert intensity to ActionValue
 */
function intensityToValue(intensity: number): ActionValue {
    if (intensity >= 8) return ActionValue.HIGH;
    if (intensity >= 4) return ActionValue.MEDIUM;
    return ActionValue.LOW;
}

/**
 * Fallback heuristic parser when AI is unavailable
 */
export function parseConfigHeuristic(rawText: string): BenchAction[] {
    const actions: BenchAction[] = [];
    const lines = rawText.split('\n');

    // Common patterns for config files
    const bindPatterns = [
        // Source engine: bind "key" "+action"
        /bind\s+["']?(\w+)["']?\s+["']?\+?(\w+)["']?/gi,
        // Key=Action format
        /(\w+)\s*=\s*["']?\+?(\w+)["']?/gi,
        // Just action names on lines
        /^\s*\+?(\w+)\s*$/gim
    ];

    // Intensity lookup based on action name keywords
    const intensityMap: Record<string, number> = {
        // High intensity (8-10)
        jump: 10, fire: 10, attack: 10, shoot: 10,
        move: 9, forward: 9, back: 9, left: 9, right: 9,
        reload: 8, crouch: 8, sprint: 8, run: 8, duck: 8,
        // Medium intensity (5-7)
        ability: 6, skill: 6, use: 6, interact: 5,
        grenade: 5, throw: 5, melee: 5, knife: 5,
        // Low intensity (1-4)
        menu: 2, settings: 1, map: 3, scoreboard: 2, chat: 2
    };

    // Type lookup
    const holdActions = ['crouch', 'duck', 'aim', 'ads', 'sprint', 'run', 'walk', 'zoom', 'scope'];

    const seenActions = new Set<string>();

    for (const line of lines) {
        for (const pattern of bindPatterns) {
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;
            while ((match = regex.exec(line)) !== null) {
                const actionName = match[2] || match[1];
                if (!actionName || seenActions.has(actionName.toLowerCase())) continue;

                seenActions.add(actionName.toLowerCase());
                const lowerName = actionName.toLowerCase();

                // Determine intensity
                let intensity = 5;
                for (const [key, value] of Object.entries(intensityMap)) {
                    if (lowerName.includes(key)) {
                        intensity = value;
                        break;
                    }
                }

                // Determine type
                const type = holdActions.some(h => lowerName.includes(h))
                    ? ActionType.HOLD
                    : ActionType.TAP;

                // Clean up the name
                const cleanName = actionName
                    .replace(/^[+_-]/, '')
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');

                actions.push({
                    id: generateId(),
                    name: cleanName,
                    type,
                    intensity,
                    value: intensityToValue(intensity),
                    simultaneousWith: [],
                    status: 'warning' as const, // Mark as needing review since it's heuristic
                    rawText: line.trim(),
                    isEdited: false
                });
            }
        }
    }

    return actions;
}
