import express, { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ContactUtils, ContactsResponse } from '../utilities/contact-utils';
import { DbSession } from '../db';

export const contactRouter = Router();

contactRouter.get('/:uid', async (req, res) => {
   const uid: number = parseInt(req.params.uid);

   let dbSession = await DbSession.create(true);
   try {
      const contactUtils = new ContactUtils(dbSession);
      
      const response: ContactsResponse = await contactUtils.getContacts(uid);
      
      res.status(response.statusCode).json(
         response.data !== null ? response.data : { error: response.error }
      );
      
   } catch (error) {
      console.error(error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
         error: 'Internal server error occurred while fetching contacts'
      });
   } finally {
      await dbSession.complete();
   }
});
