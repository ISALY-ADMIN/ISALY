import { NextResponse } from 'next/server'
import { boostPriceId, priceId, readPrice } from '@/lib/stripePrices'

export const dynamic = 'force-dynamic'

/** Montants lus dans Stripe pour l'affichage (aucun montant codé en dur). */
export async function GET() {
  const [autogestion, boost1, boost3, boost7, swiperPlus] = await Promise.all([
    readPrice(priceId('autogestion')),
    readPrice(boostPriceId(1)),
    readPrice(boostPriceId(3)),
    readPrice(boostPriceId(7)),
    readPrice(priceId('swiperPlus')),
  ])
  return NextResponse.json({ autogestion, boost1, boost3, boost7, swiperPlus })
}
