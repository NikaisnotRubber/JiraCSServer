import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'healthy',
        service: 'JiraCSServer',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}
