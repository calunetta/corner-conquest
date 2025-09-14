'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating monster encounters on islands.
 *
 * - generateMonsterEncounter - A function that generates a monster encounter.
 * - MonsterEncounterInput - The input type for the generateMonsterEncounter function.
 * - MonsterEncounterOutput - The return type for the generateMonsterEncounter function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MonsterEncounterInputSchema = z.object({
  islandDescription: z.string().describe('The description of the island.'),
});
export type MonsterEncounterInput = z.infer<typeof MonsterEncounterInputSchema>;

const MonsterEncounterOutputSchema = z.object({
  littleMonsterType: z.enum(['cub', 'huge']).describe('The type of little monster.'),
  bigMonsterType: z.enum(['cub', 'huge']).describe('The type of big monster.'),
  hasBigMonster: z.boolean().describe('Whether or not the island has a big monster.'),
});
export type MonsterEncounterOutput = z.infer<typeof MonsterEncounterOutputSchema>;

export async function generateMonsterEncounter(input: MonsterEncounterInput): Promise<MonsterEncounterOutput> {
  return monsterEncounterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'monsterEncounterPrompt',
  input: {schema: MonsterEncounterInputSchema},
  output: {schema: MonsterEncounterOutputSchema},
  prompt: `You are a game master designing monster encounters for a strategy game.

  Based on the island description, create a monster encounter.
  The island may contain two monsters or one monster. One "big" monster should always be accompanied by one "little" monster.
  A "little" monster can be accompanied by a "big" monster or another "little" monster.
  A big monster can be stronger ("huge") or weaker ("cub"). The same goes for the little monster.

  Island Description: {{{islandDescription}}}

  Output the types of monsters involved (cub or huge for both little and big), 
  and whether a big monster is present.
`,
});

const monsterEncounterFlow = ai.defineFlow(
  {
    name: 'monsterEncounterFlow',
    inputSchema: MonsterEncounterInputSchema,
    outputSchema: MonsterEncounterOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
