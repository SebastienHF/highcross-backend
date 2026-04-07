import type { ClientData } from './types';

export const testClients: ClientData[] = [
  {
    id: 'john-matthews',
    name: 'John Matthews',
    initials: 'JM',
    factFind: {
      'Date of Birth': '14 March 1974. Age 52.',
      'National Insurance': 'AB 12 34 56 C',
      'Tax Position': 'Higher rate taxpayer (40%). Recently sold IT consultancy business — may have CGT implications from sale proceeds.',
      'Employment': 'Recently sold IT consultancy business. Semi-retired. Plans full retirement at age 62.',
      'Marital Status': 'Married to Claire Matthews (age 50). She is closely involved in all major financial decisions.',
      'Dependents': 'Two adult children — Tom (25) and Emily (23). Both financially independent. No dependents under 18.',
      'Property': 'Primary residence owned outright, estimated value £650,000. No mortgage.',
      'Cash Holdings': '£500,000 held across Barclays current and savings accounts. Aware this is losing value to inflation.',
      'Pensions': 'No existing pension provision. No state pension entitlement checked yet.',
      'ISAs': '£50,000 Stocks & Shares ISA with Hargreaves Lansdown. Invested in HL Multi-Manager funds.',
      'Other Investments': 'None.',
      'Protection': 'None currently in place.',
      'Liabilities': 'None.',
      'Income & Expenditure': 'Income requirement not yet defined. Plans to retire fully at 62. Living off business sale proceeds.',
      'Risk Profile': 'Not yet formally assessed. Initial indication: cautious to moderate. Claire is more risk-averse than John.',
      'ESG Preferences': 'No strong preference expressed.',
    },
    softKnowledge: `John is a cautious, considered individual who recently sold his IT consultancy business for a significant sum. He is not impulsive and takes time to process financial decisions. His wife Claire is closely involved in all major financial decisions — any recommendation meeting should assume both will attend.

He is motivated primarily by the upcoming transition to full retirement at age 62 and wants to ensure his family is financially secure. He finds financial jargon off-putting and responds well to plain English explanations with clear reasoning.

He has no prior experience with financial advice and is slightly sceptical of the industry. Building trust through transparency and clear communication is essential. He is not in a rush but is aware the cash sitting in the bank is losing value to inflation.

Claire is more risk-averse than John and may need additional reassurance around investment risk. She is particularly interested in understanding what happens in a worst-case scenario.`,
    confirmedRecommendations: [],
    openItems: [],
    savedArtifacts: [],
    savedMessages: [],
  },
  {
    id: 'sarah-chen',
    name: 'Sarah Chen',
    initials: 'SC',
    factFind: {
      'Date of Birth': '8 September 1981. Age 44.',
      'National Insurance': 'CD 56 78 90 E',
      'Tax Position': 'Additional rate taxpayer (45%). Salary circa £135,000 per annum.',
      'Employment': 'GP Partner. Employed.',
      'Marital Status': 'Single.',
      'Dependents': 'One daughter — Lily Chen, aged 12. Single parent. Lily\'s welfare is central to all financial planning.',
      'Property': 'Renting at £2,200 per month. No property owned.',
      'Cash Holdings': 'Approximately £25,000 across current accounts.',
      'Pensions': 'NHS Pension (1995 Section) — deferred. Estimated value circa £18,000 per annum at Normal Pension Age. No additional private pension.',
      'ISAs': '£120,000 Stocks & Shares ISA on AJ Bell Youinvest platform. Invested in Vanguard ESG funds.',
      'Other Investments': '£80,000 General Investment Account on AJ Bell. Mixed equity holdings including individual shares.',
      'Protection': 'No life insurance, income protection, or critical illness cover in place. Known gap — outstanding action.',
      'Liabilities': 'None.',
      'Income & Expenditure': 'Current lifestyle expenditure circa £5,500/month after tax. No planned reduction.',
      'Risk Profile': 'Moderate to adventurous. Comfortable with equity exposure, understands volatility.',
      'ESG Preferences': 'Strong preference for ethical/ESG investing. Will not hold tobacco, arms, or fossil fuel companies. Genuine values-driven, not a passing interest.',
    },
    softKnowledge: `Sarah is highly analytical and data-driven. She responds well to numbers, charts, and evidence-based reasoning. She will challenge recommendations that lack clear rationale and expects a high standard of technical competence.

As a GP she is time-poor and prefers concise, structured communication. Long narrative reports are less effective than clear bullet points and summary tables. She reads everything in detail though and will come back with specific questions.

She has a strong interest in ethical investing and this is a genuine values-driven preference, not a passing interest. Any recommendation must align with her ESG requirements or she will not proceed.

She is a single parent and Lily's welfare is central to all financial planning. Protection is a known gap she has been meaning to address but hasn't prioritised. She may need a push on this.

She is comfortable with technology, uses the AJ Bell app regularly, and is familiar with investment terminology. She does not need things simplified but does appreciate when complex topics are presented clearly.`,
    confirmedRecommendations: [
      {
        type: 'ISA Review',
        summary: 'ISA reviewed and consolidated onto AJ Bell Youinvest platform. Moved from mixed fund holdings to Vanguard ESG Global All Cap fund. Total value at point of consolidation: £108,000.',
        confirmedAt: '2024-12-14T10:30:00Z',
      },
    ],
    openItems: [
      'Protection needs analysis outstanding — life cover and income protection to be assessed given single parent status and no existing cover.',
    ],
    savedArtifacts: [],
    savedMessages: [],
  },
];
