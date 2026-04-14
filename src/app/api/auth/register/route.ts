import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password } = await request.json();

    // Validation
    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Tous les champs sont requis' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caracteres' },
        { status: 400 }
      );
    }

    // Check existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe deja' },
        { status: 409 }
      );
    }

    // Generate username from email
    let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._-]/g, '_').slice(0, 30);
    let username = baseUsername;
    let suffix = 2;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    // Generate avatar from initials
    const nameParts = fullName.trim().split(/\s+/);
    const avatar =
      nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : fullName.trim().slice(0, 2).toUpperCase();

    // Hash password
    const passwordHash = await hash(password, 12);

    // Get default role (consult)
    const consultRole = await prisma.role.findUnique({ where: { code: 'consult' } });
    if (!consultRole) {
      return NextResponse.json({ error: 'Default role not found' }, { status: 500 });
    }

    // Create user
    await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        username,
        passwordHash,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        roleId: consultRole.id,
        avatar,
        poleIds: [],
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      { message: 'Compte cree avec succes' },
      { status: 201 }
    );
  } catch (error: any) {
    // Prisma unique constraint violation
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Un compte avec cet email existe deja' },
        { status: 409 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
