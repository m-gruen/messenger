import express, { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getContacts, ContactsResponse } from '../utilities/contact-utils';

export const contactRouter = Router();

contactRouter.get('/:id', async (req, res) => {
   const idParam = req.params.id;
   
   if (!idParam || !/^\d+$/.test(idParam)) {
      res.status(StatusCodes.BAD_REQUEST).json({ 
         message: "Invalid user ID format. Must be a positive integer." 
      });
      return;
   }
   
   const id = parseInt(idParam, 10);

   try {
      const response: ContactsResponse = await getContacts(id);
      res.status(response.statusCode).json(
         response.data !== null ? response.data : { message: response.message }
      );
   } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
         message: "An unexpected error occurred while processing your request" 
      });
   }
});
