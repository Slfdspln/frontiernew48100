import { NextResponse } from 'next/server';
import { Frontier } from '../../../../../utils/frontierClient';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const profile = await Frontier.getProfile(id);
    return NextResponse.json(profile);
  } catch (error) {
    console.error(`Failed to fetch profile ${params.id} from Frontier API:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch profile details' }, 
      { status: 500 }
    );
  }
}