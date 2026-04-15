import { NextRequest, NextResponse } from 'next/server';
import { initializeWhatsAppClient, getClientStatus } from '@/lib/whatsapp-client';

let qrCodeData: string | null = null;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'status') {
      const status = getClientStatus();
      return NextResponse.json({
        success: true,
        status,
        qrCode: qrCodeData,
      });
    }

    if (action === 'init') {
      try {
        const client = await initializeWhatsAppClient();
        const status = getClientStatus();
        
        return NextResponse.json({
          success: true,
          message: 'Cliente WhatsApp inicializando...',
          status,
          qrCode: qrCodeData,
        });
      } catch (error: any) {
        return NextResponse.json(
          {
            success: false,
            error: error.message || 'Erro ao inicializar cliente',
          },
          { status: 500 }
        );
      }
    }

    // Retornar status por padrão
    const status = getClientStatus();
    return NextResponse.json({
      success: true,
      status,
      qrCode: qrCodeData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro interno',
      },
      { status: 500 }
    );
  }
}
