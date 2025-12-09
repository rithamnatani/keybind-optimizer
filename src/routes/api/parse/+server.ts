/**
 * Parse Config API Endpoint
 * 
 * POST /api/parse
 * Body: { text: string }
 * Returns: { actions: BenchAction[], error?: string }
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseConfigWithAI } from '$lib/services/parser';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const { text } = body;

        if (!text || typeof text !== 'string') {
            return json(
                { actions: [], error: 'Missing or invalid "text" field' },
                { status: 400 }
            );
        }

        if (text.trim().length === 0) {
            return json(
                { actions: [], error: 'Empty config text' },
                { status: 400 }
            );
        }

        const actions = await parseConfigWithAI(text);

        return json({ actions });

    } catch (error) {
        console.error('Parse API error:', error);
        return json(
            { actions: [], error: 'Failed to parse config' },
            { status: 500 }
        );
    }
};
