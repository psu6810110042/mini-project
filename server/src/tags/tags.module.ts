import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // <--- Import this
import { TagsService } from './tags.service';
import { TagsController } from './tags.controller';
import { Tag } from './entities/tag.entity'; // <--- Import Entity

@Module({
  imports: [TypeOrmModule.forFeature([Tag])], // <--- Register Repository
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService], // Exporting is good practice in case other modules need it
})
export class TagsModule {}