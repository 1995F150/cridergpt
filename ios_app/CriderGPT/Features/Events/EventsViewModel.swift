import Foundation
import Supabase

@MainActor
final class EventsViewModel: ObservableObject {
    @Published var events: [CGEvent] = []
    @Published var loading = false
    @Published var error: String?

    func load() async {
        loading = true; defer { loading = false }
        error = nil
        do {
            let rows: [CGEvent] = try await SB.client
                .from("events")
                .select()
                .order("event_date", ascending: true)
                .execute()
                .value
            self.events = rows
        } catch {
            self.error = "Couldn't load events. \(error.localizedDescription)"
        }
    }

    func create(title: String, date: Date, time: Date?, description: String?, visibility: String) async {
        let df = DateFormatter(); df.dateFormat = "yyyy-MM-dd"
        let tf = DateFormatter(); tf.dateFormat = "HH:mm:ss"
        struct Insert: Encodable {
            let title: String; let description: String?; let event_date: String
            let event_time: String?; let visibility: String
        }
        do {
            try await SB.client.from("events").insert(Insert(
                title: title, description: description,
                event_date: df.string(from: date),
                event_time: time.map { tf.string(from: $0) },
                visibility: visibility
            )).execute()
            await load()
        } catch {
            self.error = "Couldn't create event. \(error.localizedDescription)"
        }
    }
}
