import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cartItems);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { productId, quantity = 1 } = await req.json();

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return NextResponse.json({ error: "Produit non trouvé" }, { status: 404 });
  }

  if (product.stock < quantity) {
    return NextResponse.json({ error: "Stock insuffisant" }, { status: 400 });
  }

  const cartItem = await prisma.cartItem.upsert({
    where: {
      userId_productId: {
        userId: session.user.id,
        productId,
      },
    },
    update: {
      quantity: { increment: quantity },
    },
    create: {
      userId: session.user.id,
      productId,
      quantity,
    },
  });

  return NextResponse.json(cartItem);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await prisma.cartItem.delete({
      where: { id, userId: session.user.id },
    });
  } else {
    await prisma.cartItem.deleteMany({
      where: { userId: session.user.id },
    });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id, quantity } = await req.json();

  if (quantity < 1) {
    await prisma.cartItem.delete({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  }

  const cartItem = await prisma.cartItem.update({
    where: { id, userId: session.user.id },
    data: { quantity },
  });

  return NextResponse.json(cartItem);
}