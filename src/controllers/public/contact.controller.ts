import { Request, Response } from 'express';
import { db } from '../../configs/db.config';
import { contactRequests } from '../../db/schema';
import emailConfig from '../../configs/email.config';

export const submitContactRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const newRequest = await db.insert(contactRequests).values({
            name,
            email,
            subject,
            message,
        }).returning();

        await emailConfig.sendEmail(
            process.env.ADMIN_EMAIL!,
            `New Contact Request: ${subject}`,
            `<h1>New Contact Request Received</h1>
             <p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Subject:</strong> ${subject}</p>
             <p><strong>Message:</strong></p>
             <p>${message}</p>`
        );

        res.status(201).json({ message: 'Contact request submitted successfully', data: newRequest[0] });
    } catch (error: unknown) {
        res.status(500).json({ message: 'Server error while submitting request' });
    }
};