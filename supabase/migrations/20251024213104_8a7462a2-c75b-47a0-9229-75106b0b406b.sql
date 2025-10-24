-- Create table for Jessie's writing samples
CREATE TABLE IF NOT EXISTS public.writing_samples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.writing_samples ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading writing samples
CREATE POLICY "Writing samples are viewable by everyone" 
ON public.writing_samples 
FOR SELECT 
USING (true);

-- Create policy for Jessie to manage writing samples
CREATE POLICY "Jessie can manage writing samples" 
ON public.writing_samples 
FOR ALL
USING (auth.uid()::text = '00000000-0000-0000-0000-000000000000' OR auth.email() = 'jessiecrider3@gmail.com');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_writing_samples_updated_at
BEFORE UPDATE ON public.writing_samples
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Jessie's existing essays
INSERT INTO public.writing_samples (title, content, category) VALUES
('Country Life vs City Life', 'Do you think Country life is better than city life?
In the country you can farm, do better work that pays more, and you can weld and hunt. In the city you can''t farm, or weld, or hunt because the city has no places to hunt like a field or forest. The city has no land to farm on. You cant repair or weld on farm equipment in the city because there is no room.
Country life is better than city life because you can farm, weld, and hunt.
You can farm in the country. You can''t farm in the city. In the country you can dairy farm to produce milk. In the country you can do beef farming. Beef farming is cattle that are raised for meat. You can do forestry which is farming that is used to harvest wood.When farming you have to weld to repair farm equipment and farm trucks.
In the country you can weld things, or repair farm equipment. FIxing things that breaks like equipment that would be alot of money if you don''t repair it yourself. You can weld some tools when they break on you so you don''t have to repair them. You can weld a homemade flatbed with a fifth wheel to haul trailers or grain carts that requires a fifth wheel instead of using a semi truck to haul grain. You can use a Cummins with a homemade flatbed with a fifth wheel. The cummins have the horsepower to pull heavy loads. That homemade flatbed can be used in hunting.
In the country you can hunt deer and other animals that you can''t hunt in the city. The city doesn''t have woods and deer are found in the woods a lot so when hunting for deer you need to be in the country in the woods finding deer. You can hunt on farms because some deer look for food on farms and eat the crops that the farmer is growing. You can''t hunt in the city because you can''t find deer in the city.
There are alot of things you can do in the country that you can''t do in the city. In conclusion, you can farm in the country, weld, and you can hunt in the country.', 'essay'),

('Letter to Wythe County School Board', 'Jessie Crider
248 Layne Plantation Dr
Wytheville VA 24382
jessiecrider210@gmail.com
276-613-8641
8/30/2024

Wythe County School Board
1570 West Reservoir Street
Wytheville VA 24382

I''m writing this letter to the Wythe County School Board about the cell phone policy. How it should be changed respectfully. I hope to persuade you to reconsider and revise the policy.
We should be allowed to use phones in between classes and at lunch because we ain''t in class. If we get done early we should be allowed to be on phones in class when we got nothing to do because we did our work. We will have nothing to do when we are done with our work. Our phones can help us with our work to find the meaning of words. We should be allowed to listen to music in class to get work done.', 'letter'),

('SOL Challenge Essay', 'Students have challenges every day in their lives. My challenge is passing the Standards of Learning tests. Three ways I will overcome my challenge with SOLs are by coming to school, completing all my work, and asking the teacher for help.
First, when I come to school every day, I will not miss any lessons or instruction from my teachers. It is important to not miss a day of school because if I miss a day of school I will miss a lesson and instruction. That will make me behind and I will not pass the SOLs because of that. If I don''t pass the SOL I could fail the grade.
Next, in order to pass the SOLs, I need to complete all my assigned classwork and homework. Completing my work will help me pass the SOLs. If my work is not completed, I could fail my SOL because I did not learn the skills to do the SOLs. Learning the skills are important.
Last but not least, anytime I have a question, I will simply ask the teacher, so I know how to do it in the future. It is very important to ask the teacher for help, so I can pass the SOLs. Because anything I don''t know can make me fail the SOL.
In conclusion coming to school every day is important, completing my work and asking for help are all the steps to pass a SOL.', 'essay'),

('1995 Ford F-150 Essay', 'One feature of a Ford F-150 is that it has four wheel drive. When you get in a winter storm, you can kick 4x4 in gear or you get in mud and can''t get out its has Low range and high four wheel drive you can drive when it''s mud or snow. 4x4 is for offroad and snow and mud. The engine has 6-cylinder inline for more horsepower. The engine can last over 300,000 miles. The engine is built really well. Its has 150 horsepower and the engine is gas. The transmission is a 5 speed manual transmission. The truck can tow 7,500 Ibs. Is considered a classic workhorse truck from its era.', 'essay'),

('Honesty Is the Best Policy', 'An old proverb says honesty is the best policy. I agree with this statement. The benefits of being honest outweigh those of lying. Two reasons I agree with being honest at all times are because it makes me a good person and means I will not have a guilty conscience.
To begin with, by always telling the truth, I know I am a good person and make an excellent friend. For example, if I get in trouble and lie about something, it will get deeper into a hole than if I simply would have told the truth. Also, if someone finds out about it, I will be in even more trouble. Therefore, I can''t lie about it. On the other hand, if I don''t lie about something, then I will be in less trouble. When I don''t lie, I can be trusted versus if I lie then I cannot be trusted. There is a trust level; if I am below it, I can''t be trusted. If I am above it, I can be trusted. I want to be above it, so my friends know they can trust me and I am a good person. That is why I am honest at all times.
Last but not least, I can also avoid having a guilty conscience weighing on my shoulders by simply telling the truth. For example, in the book Nothing But the Truth Philip Malloy started a lie because he wanted to leave Miss Narwin''s class and one small lie made it one big lie and it got worse and then Philip Malloy was lying about sing The National Anthem and then Philip Malloy said he was humming at the end Philip Malloy admits that he lied. So all the things Philip lies about can backfire on him.
In conclusion, these are just a few of the infinite reasons why I always strive to tell the truth at all times instead of lying. To be easy do not lie and if I lie my hole will get deeper so to begin with if I tell the truth the whole time I would not be in even more trouble.', 'essay'),

('The Giver Book vs Movie', 'The Giver by Lois Lowry has been a part of the classic canon of literature for many years. She explores the topic of a possible utopia within Jonas'' community. As the novel unfolds, readers begin to ponder if an utopia can realistically exist. After having read the novel and watching the movie, there are many similarities and differences between the two.
For starters, there are many similarities from book to movie. Sameness is the same in the movie and book. Sameness is no feelings, color, or differences. Everything is in black and white because they can''t see color. Also, there are no feelings because of the pill or injection that stops emotion. Another similarity is the Annex where The Giver lives and gives Jonas all the memories. Last, Jonas'' Assignment remains the same as Receiver of Memory. There is a speaker in the community.
On the other hand, there are way more differences from book to movie than there are similarities. In the movie, Jonas asks many things like he said fear which was not in the book. Also, in the movie they didn''t take pills for feeling; instead, they got injections. Everything is robotic in the community in the book is not robotic. Asher is number 51 and he is a drone pilot and Asher and Fiona Assignment changed.
In conclusion, I prefer the movie over the book. One reason is because things have changed in the movie. That was not in the book like how Jonas escaped the community and I like how Jonas takes the apple and injects it with an injection so he doesn''t have to get an injection. With the injections that the community takes they have no emotions.', 'essay'),

('Freedom Quote Essay', 'Franklin D. Roosevelt once said "In the truest sense, freedom cannot be bestowed, it must be achieved." President FDR was making good people think how to be good Americans. How can we be good Americans? Some ways I am a good American are by volunteering my time and obeying our country''s laws.
First off, to be a good American, I will volunteer my time to put those around me above myself. For example, I can volunteer at a homeless shelter or soup kitchen, join the military, and help serve our country. Picking up trash is another way to volunteer. It makes the town look nicer, as well as shows that I take pride in my community and country. Joining the military is another good way to serve the country. It helps keep us free and protects people and our country.
Last but not least, through following the laws, I can be a good citizen of the United States of America, and help other people that need help. It is an important part of following the laws. It is the right thing to do because it keeps people safe. If you don''t follow the laws you can go to jail. A good citizen follows the laws even though they don''t have to because they love their country.
Some good ways to be a good citizen is to volunteer my time and obey the law. It is very important to be a good citizen and follow the laws, volunteering to help people. Following the laws is important because, and our police keep us safe. That is why we follow the laws to keep us safe and it is important. Volunteer homeless shelter helping homeless people. We should enjoy our freedom because other countries don''t have the same rights and freedoms we have to help our country.', 'essay');