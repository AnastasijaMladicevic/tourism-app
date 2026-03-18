public class WordService
{
  private readonly WordRepository repo = new WordRepository();

  public List<Word> GetAll() => repo.GetAll();
  public void Add(string text) => repo.Add(text);
  public void Delete(int id) => repo.Delete(id);
  public void Update(int id, string text) => repo.Update(id, text);
}