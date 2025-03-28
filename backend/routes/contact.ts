import express, { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getContacts, ContactsResponse } from '../utilities/contact-utils';

export const contactRouter = Router();

contactRouter.get('/:uid', async (req, res) => {
   const uid: number = parseInt(req.params.uid);

   if (isNaN(uid) || uid < 0 || !Number.isInteger(uid)) {
      res.status(StatusCodes.BAD_REQUEST).send({
         error: 'invalid user id'
      });
      return;
   }

   try {
      const response: ContactsResponse = await getContacts(uid);
      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );
   } catch (error) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: "An unexpected error occurred while processing your request"
      });
   }
});
